import RateLimitedRoute from './RateLimitedRoute';
import RateLimiter from '../rate-limiting/RateLimiter';
import Database from '../database/Database';
import PasswordEncoder from '../security/PasswordEncoder';
import { ErrorResponse } from './AbstractRoute';
import { ensureRateLimit } from '../commons/helpers';

class AuthRoute extends RateLimitedRoute {
  private database: Database;
  private passwordEncoder: PasswordEncoder;

  public constructor(rateLimiter: RateLimiter, database: Database, passwordEncoder: PasswordEncoder) {
    super(rateLimiter);
    this.database = database;
    this.passwordEncoder = passwordEncoder;

    this.add('PUT', '/auth', this.logIn.bind(this));
    this.add('DELETE', '/auth', this.logOut.bind(this));
  }

  // PUT /auth
  private async logIn(request: Record<string, any>, response: Record<string, any>): Promise<void> {
    const { usernameOrEmail, password } = request.body;
    if (typeof usernameOrEmail !== 'string') {
      throw new ErrorResponse(400, 'Invalid usernameOrEmail');
    }
    if (typeof password !== 'string') {
      throw new ErrorResponse(400, 'Invalid password');
    }
    await ensureRateLimit(this.rateLimiter, request.ip, 'checkCredentials');
    const rows = await this.database.query('SELECT id, email, password_hash, suspended FROM user WHERE username = ? OR email = ?', [usernameOrEmail, usernameOrEmail]);
    if (rows.length === 0) {
      const [{ count }] = await this.database.query('SELECT COUNT(*) AS count FROM email_update WHERE email = ?', usernameOrEmail);
      if (count > 0) {
        throw new ErrorResponse(403, 'Unverified email address');
      }
      throw new ErrorResponse(404, 'No such user');
    }
    const [{ id, email, passwordHash, suspended }] = rows;
    if (!await this.passwordEncoder.compare(password, passwordHash)) {
      throw new ErrorResponse(422, 'Password incorrect');
    }
    if (email === null) {
      throw new ErrorResponse(403, 'Unverified email address');
    }
    if (suspended) {
      throw new ErrorResponse(403, 'Account suspended');
    }
    request.session.myUserId = id;
    response.status(201).end();
  }

  // DELETE /auth
  private async logOut(request: Record<string, any>, response: Record<string, any>): Promise<void> {
    if (request.session) {
      await new Promise<void>((resolve, reject) => {
        request.session.destroy(error => {
          if (error) reject(error); else resolve();
        });
      });
    }
    response.status(204).end();
  }
}

export default AuthRoute;
