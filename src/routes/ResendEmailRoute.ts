import RateLimitedRoute from './RateLimitedRoute';
import RateLimiter from '../rate-limiting/RateLimiter';
import Logger from '../logging/Logger';
import Database from '../database/Database';
import TokenGenerator from '../security/TokenGenerator';
import Mailer from '../mailing/Mailer';
import { ErrorResponse } from './AbstractRoute';
import { sendVerificationEmail } from '../commons/mail';
import {
  ensureRateLimit,
  ensureEmailValid,
} from '../commons/helpers';

class ResendEmailRoute extends RateLimitedRoute {
  private logger: Logger;
  private database: Database;
  private tokenGenerator: TokenGenerator;
  private readonly mailer: Mailer;
  private readonly verifyEmailUrl: string;

  public constructor(
    rateLimiter: RateLimiter,
    logger: Logger,
    database: Database,
    tokenGenerator: TokenGenerator,
    mailer: Mailer,
    verifyEmailUrl: string
  ) {
    super(rateLimiter);
    this.database = database;
    this.logger = logger;
    this.tokenGenerator = tokenGenerator;
    this.mailer = mailer;
    this.verifyEmailUrl = verifyEmailUrl;

    this.add('POST', '/resend_email', this.resendEmail.bind(this));
  }

  // GET /resend_email
  private async resendEmail(request: Record<string, any>, response: Record<string, any>): Promise<void> {
    const { username, email, captchaText } = request.body;
    if (typeof username !== 'string') {
      throw new ErrorResponse(400, 'Invalid username');
    }
    if (typeof email !== 'string') {
      throw new ErrorResponse(400, 'Invalid email');
    }
    if (typeof captchaText !== 'string') {
      throw new ErrorResponse(400, 'Invalid captchaText');
    }
    if (captchaText.toLowerCase() !== request.session.captchaText.toLowerCase()) {
      throw new ErrorResponse(422, 'Wrong CAPTCHA text');
    }
    const rows = await this.database.query('SELECT id, email FROM user WHERE username = ?', username);
    if (rows.length === 0) {
      throw new ErrorResponse(404, 'No such user');
    }
    const [{ id: userId, email: oldEmail }] = rows;
    if (oldEmail !== null) {
      throw new ErrorResponse(403, 'Cannot resend verification email to this user');
    }
    ensureEmailValid(email);
    const transaction = await this.database.newTransaction();
    await transaction.begin();
    try {
      const [{ count }] = await transaction.query('SELECT COUNT(*) AS count FROM user WHERE email = ?', email);
      if (count > 0) {
        throw new ErrorResponse(409, 'Email address already taken');
      }
      await ensureRateLimit(this.rateLimiter, request.ip, 'sendMail');
      const token = await this.tokenGenerator.generate();
      await transaction.update('INSERT INTO email_update (user_id, email, token, expiry_time) VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 48 HOUR))', [userId, email, token]);
      await transaction.update('DELETE FROM email_update WHERE expiry_time < NOW()');
      await transaction.commit();
      sendVerificationEmail(this.mailer, email, token, this.verifyEmailUrl).catch(e => {
        this.logger.error(e.stack);
      });
      response.status(202).end();
    } finally {
      await transaction.end();
    }
  }
}

export default ResendEmailRoute;
