import RateLimitedRoute from './RateLimitedRoute';
import RateLimiter from '../rate-limiting/RateLimiter';
import Logger from '../logging/Logger';
import Database from '../database/Database';
import PasswordEncoder from '../security/PasswordEncoder';
import { ErrorResponse } from './AbstractRoute';
import { ensurePasswordValid } from '../commons/helpers';
import { destroySessionsOfUser } from '../commons/session';

class ResetPasswordRoute extends RateLimitedRoute {
  private logger: Logger;
  private database: Database;
  private passwordEncoder: PasswordEncoder;

  public constructor(rateLimiter: RateLimiter, logger: Logger, database: Database, passwordEncoder: PasswordEncoder) {
    super(rateLimiter);
    this.logger = logger;
    this.database = database;
    this.passwordEncoder = passwordEncoder;

    this.add('POST', '/reset_password', this.resetPassword.bind(this));
  }

  // POST /reset_password
  private async resetPassword(request: Record<string, any>, response: Record<string, any>): Promise<void> {
    const { token, password } = request.body;
    if (typeof token !== 'string') {
      throw new ErrorResponse(400, 'Invalid token');
    }
    if (typeof password !== 'string') {
      throw new ErrorResponse(400, 'Invalid password');
    }
    const rows = await this.database.query('SELECT user_id FROM password_reset WHERE token = ? AND expiry_time > NOW()', token);
    if (rows.length === 0) {
      throw new ErrorResponse(422, 'Invalid token');
    }
    ensurePasswordValid(password);
    const [{ userId }] = rows;
    const passwordHash = await this.passwordEncoder.encode(password);
    await this.database.update('UPDATE user SET password_hash = ? WHERE id = ?', [passwordHash, userId]);
    await this.database.update('DELETE FROM password_reset WHERE token = ?', token);
    destroySessionsOfUser(request.sessionStore, userId).catch(e => {
      this.logger.error(e.stack);
    });
    response.status(200).end();
  }
}

export default ResetPasswordRoute;
