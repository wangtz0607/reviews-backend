import RateLimitedRoute from './RateLimitedRoute';
import RateLimiter from '../rate-limiting/RateLimiter';
import Database from '../database/Database';
import { ErrorResponse } from './AbstractRoute';

class VerifyEmailRoute extends RateLimitedRoute {
  private database: Database;

  public constructor(rateLimiter: RateLimiter, database: Database) {
    super(rateLimiter);
    this.database = database;

    this.add('POST', '/verify_email', this.verifyEmail.bind(this));
  }

  private async verifyEmail(request: Record<string, any>, response: Record<string, any>): Promise<void> {
    const { token } = request.body;
    if (typeof token !== 'string') {
      throw new ErrorResponse(400, 'Invalid token');
    }
    const transaction = await this.database.newTransaction();
    await transaction.begin();
    try {
      const rows = await transaction.query('SELECT user_id, email FROM email_update WHERE token = ? AND expiry_time > NOW()', token);
      if (rows.length === 0) {
        throw new ErrorResponse(400, 'Invalid token');
      }
      const [{ userId, email }] = rows;
      const [{ count }] = await transaction.query('SELECT COUNT(*) AS count FROM user WHERE email = ? AND id != ?', [email, userId]);
      if (count > 0) {
        throw new ErrorResponse(409, 'Email address already taken');
      }
      await transaction.update('UPDATE user SET email = ? WHERE id = ?', [email, userId]);
      await transaction.update('DELETE FROM email_update WHERE token = ?', token);
      await transaction.commit();
    } finally {
      await transaction.end();
    }
    response.status(200).end();
  }
}

export default VerifyEmailRoute;
