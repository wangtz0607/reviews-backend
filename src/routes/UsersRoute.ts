import RateLimitedRoute from './RateLimitedRoute';
import RateLimiter from '../rate-limiting/RateLimiter';
import Logger from '../logging/Logger';
import Database from '../database/Database';
import PasswordEncoder from '../security/PasswordEncoder';
import TokenGenerator from '../security/TokenGenerator';
import Mailer from '../mailing/Mailer';
import { ErrorResponse } from './AbstractRoute';
import { queryUsers } from '../commons/query';
import { sendVerificationEmail } from '../commons/mail';
import {
  ensureUsernameValid,
  ensureEmailValid,
  ensurePasswordValid,
  ensureNameValid,
  ensureGravatarEmailValid,
  ensureLoggedIn,
  getLimitOffset,
  getUserId,
  ensureRateLimit
} from '../commons/helpers';
import { destroySessionsOfUser } from '../commons/session';
import { computeGravatarHash } from '../commons/miscellaneous';

class UsersRoute extends RateLimitedRoute {
  private logger: Logger;
  private readonly database: Database;
  private passwordEncoder: PasswordEncoder;
  private tokenGenerator: TokenGenerator;
  private readonly mailer: Mailer;
  private readonly verifyEmailUrl: string;

  public constructor(
    rateLimiter: RateLimiter,
    logger: Logger,
    database: Database,
    passwordEncoder: PasswordEncoder,
    tokenGenerator: TokenGenerator,
    mailer: Mailer,
    verifyEmailUrl: string
  ) {
    super(rateLimiter);
    this.logger = logger;
    this.database = database;
    this.passwordEncoder = passwordEncoder;
    this.tokenGenerator = tokenGenerator;
    this.mailer = mailer;
    this.verifyEmailUrl = verifyEmailUrl;

    this.add('GET', '/users', this.getUsers.bind(this));
    this.add('GET', '/users/search', this.searchUsers.bind(this));
    this.add('GET', '/users/:userId', this.getUserById.bind(this));
    this.add('POST', '/users', this.createUser.bind(this));
    this.add('GET', '/me', this.getMe.bind(this));
    this.add('PATCH', '/me', this.updateMe.bind(this));
  }

  // GET /users
  private async getUsers(request: Record<string, any>, response: Record<string, any>): Promise<void> {
    const { limit, offset } = getLimitOffset(request.query);
    response.status(200).json(await queryUsers(this.database, { limit, offset }));
  }

  // GET /users/search
  private async searchUsers(request: Record<string, any>, response: Record<string, any>): Promise<void> {
    const { keyword } = request.query;
    if (keyword === undefined) {
      throw new ErrorResponse(400, 'keyword required');
    }
    const { limit, offset } = getLimitOffset(request.query);
    response.status(200).json(await queryUsers(this.database, { keyword, limit, offset }));
  }

  // GET /users/:userId
  private async getUserById(request: Record<string, any>, response: Record<string, any>): Promise<void> {
    const userId = getUserId(request.params);
    const rows = await queryUsers(this.database, { id: userId });
    if (rows.length === 0) {
      throw new ErrorResponse(404, 'No such user');
    }
    response.status(200).json(rows[0]);
  }

  // POST /users
  private async createUser(request: Record<string, any>, response: Record<string, any>): Promise<void> {
    const transaction = await this.database.newTransaction();
    await transaction.begin();
    try {
      const { username, email, password, captchaText } = request.body;
      if (typeof username !== 'string') {
        throw new ErrorResponse(400, 'Invalid username');
      }
      if (typeof email !== 'string') {
        throw new ErrorResponse(400, 'Invalid email');
      }
      if (typeof password !== 'string') {
        throw new ErrorResponse(400, 'Invalid password');
      }
      if (typeof captchaText !== 'string') {
        throw new ErrorResponse(400, 'Invalid captchaText');
      }
      if (captchaText.toLowerCase() !== request.session.captchaText.toLowerCase()) {
        throw new ErrorResponse(422, 'Wrong CAPTCHA text');
      }
      ensureUsernameValid(username);
      let [{ count }] = await transaction.query('SELECT COUNT(*) AS count FROM user WHERE username = ?', username);
      if (count > 0) {
        throw new ErrorResponse(409, 'Username already taken');
      }
      ensureEmailValid(email);
      [{ count }] = await transaction.query('SELECT COUNT(*) AS count FROM user WHERE email = ?', email);
      if (count > 0) {
        throw new ErrorResponse(409, 'Email address already taken');
      }
      ensurePasswordValid(password);
      await ensureRateLimit(this.rateLimiter, request.ip, 'createUser');
      await ensureRateLimit(this.rateLimiter, request.ip, 'sendMail');
      const passwordHash = await this.passwordEncoder.encode(password);
      await transaction.update('INSERT INTO user (username, password_hash, registration_time) VALUE (?, ?, NOW())', [username, passwordHash]);
      const [{ id }] = await transaction.query('SELECT LAST_INSERT_ID() AS id');
      const token = await this.tokenGenerator.generate();
      await transaction.update('INSERT INTO email_update (user_id, email, token, expiry_time) VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 48 HOUR))', [id, email, token]);
      await transaction.update('DELETE FROM email_update WHERE expiry_time < NOW()');
      await transaction.commit();
      sendVerificationEmail(this.mailer, email, token, this.verifyEmailUrl).catch(e => {
        this.logger.error(e.stack);
      });
    } finally {
      await transaction.end();
    }
    response.status(201).end();
  }

  // GET /me
  private async getMe(request: Record<string, any>, response: Record<string, any>): Promise<void> {
    ensureLoggedIn(request.session);
    const myUserId = request.session.myUserId;
    const [{ username, email, name, gravatarEmail, registrationTime }] = await this.database.query('SELECT username, email, name, gravatar_email, registration_time FROM user WHERE id = ?', myUserId);
    const gravatarHash = computeGravatarHash(gravatarEmail);
    response.status(200).json({ id: myUserId, username, email, name, gravatarEmail, gravatarHash, registrationTime });
  }

  // PATCH /me
  private async updateMe(request: Record<string, any>, response: Record<string, any>): Promise<void> {
    ensureLoggedIn(request.session);
    const myUserId = request.session.myUserId;
    if (Object.hasOwn(request.body, 'password') && !Object.hasOwn(request.body, 'oldPassword')) {
      throw new ErrorResponse(400, 'oldPassword required');
    }
    if (Object.hasOwn(request.body, 'oldPassword') && !Object.hasOwn(request.body, 'password')) {
      throw new ErrorResponse(400, 'password required');
    }
    const transaction = await this.database.newTransaction();
    await transaction.begin();
    try {
      let email, token;
      if (Object.hasOwn(request.body, 'email')) {
        ({ email } = request.body);
        if (typeof email !== 'string') {
          throw new ErrorResponse(400, 'Invalid email');
        }
        ensureEmailValid(email);
        const [{ count }] = await transaction.query('SELECT COUNT(*) AS count FROM user WHERE email = ? AND id != ?', [email, myUserId]);
        if (count > 0) {
          throw new ErrorResponse(409, 'Email address already taken');
        }
        await ensureRateLimit(this.rateLimiter, [request.ip, myUserId], 'sendMail');
        token = await this.tokenGenerator.generate();
        await transaction.update('INSERT INTO email_update (user_id, email, token, expiry_time) VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 48 HOUR))', [myUserId, email, token]);
        await transaction.update('DELETE FROM email_update WHERE expiry_time < NOW()');
      }
      if (Object.hasOwn(request.body, 'password')) {
        const { oldPassword, password } = request.body;
        if (typeof oldPassword !== 'string') {
          throw new ErrorResponse(400, 'Invalid oldPassword');
        }
        if (typeof password !== 'string') {
          throw new ErrorResponse(400, 'Invalid password');
        }
        const [{ passwordHash: oldPasswordHash }] = await transaction.query('SELECT password_hash FROM user WHERE id = ?', myUserId);
        if (!await this.passwordEncoder.compare(oldPassword, oldPasswordHash)) {
          throw new ErrorResponse(422, 'Old password incorrect');
        }
        ensurePasswordValid(password);
        const passwordHash = await this.passwordEncoder.encode(password);
        await transaction.update('UPDATE user SET password_hash = ? WHERE id = ?', [passwordHash, myUserId]);
      }
      if (Object.hasOwn(request.body, 'name')) {
        const { name } = request.body;
        if (name !== null && typeof name !== 'string') {
          throw new ErrorResponse(400, 'Invalid name');
        }
        if (name === null) {
          await transaction.update('UPDATE user SET name = NULL WHERE id = ?', myUserId);
        } else {
          ensureNameValid(name);
          await transaction.update('UPDATE user SET name = ? WHERE id = ?', [name, myUserId]);
        }
      }
      if (Object.hasOwn(request.body, 'gravatarEmail')) {
        const { gravatarEmail } = request.body;
        if (gravatarEmail !== null && typeof gravatarEmail !== 'string') {
          throw new ErrorResponse(400, 'Invalid gravatarEmail');
        }
        if (gravatarEmail === null) {
          await transaction.update('UPDATE user SET gravatar_email = NULL WHERE id = ?', myUserId);
        } else {
          ensureGravatarEmailValid(gravatarEmail);
          await transaction.update('UPDATE user SET gravatar_email = ? WHERE id = ?', [gravatarEmail, myUserId]);
        }
      }
      await transaction.commit();
      if (Object.hasOwn(request.body, 'password')) {
        destroySessionsOfUser(request.sessionStore, myUserId).catch(e => {
          this.logger.error(e.stack);
        });
      }
      if (Object.hasOwn(request.body, 'email')) {
        sendVerificationEmail(this.mailer, email, token, this.verifyEmailUrl).catch(e => {
          this.logger.error(e.stack);
        });
      }
    } finally {
      await transaction.end();
    }
    response.status(200).end();
  }
}

export default UsersRoute;
