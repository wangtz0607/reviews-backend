import RateLimitedRoute from './RateLimitedRoute';
import RateLimiter from '../rate-limiting/RateLimiter';
import Logger from '../logging/Logger';
import Database from '../database/Database';
import TokenGenerator from '../security/TokenGenerator';
import Mailer from '../mailing/Mailer';
import { ErrorResponse } from './AbstractRoute';
import { sendPasswordResetEmail } from '../commons/mail';
import { ensureRateLimit } from '../commons/helpers';

class RequestPasswordResetRoute extends RateLimitedRoute {
  private logger: Logger;
  private database: Database;
  private tokenGenerator: TokenGenerator;
  private readonly mailer: Mailer;
  private readonly resetPasswordUrl: string;

  public constructor(
    rateLimiter: RateLimiter,
    logger: Logger,
    database: Database,
    tokenGenerator: TokenGenerator,
    mailer: Mailer,
    resetPasswordUrl: string
  ) {
    super(rateLimiter);
    this.logger = logger;
    this.database = database;
    this.tokenGenerator = tokenGenerator;
    this.mailer = mailer;
    this.resetPasswordUrl = resetPasswordUrl;

    this.add('POST', '/request_password_reset', this.requestPasswordReset.bind(this));
  }

  // POST /request_password_reset
  public async requestPasswordReset(request: Record<string, any>, response: Record<string, any>): Promise<void> {
    const { email, captchaText } = request.body;
    if (typeof email !== 'string') {
      throw new ErrorResponse(400, 'Invalid email');
    }
    if (typeof captchaText !== 'string') {
      throw new ErrorResponse(400, 'Invalid captchaText');
    }
    if (captchaText.toLowerCase() !== request.session.captchaText.toLowerCase()) {
      throw new ErrorResponse(422, 'Wrong CAPTCHA text');
    }
    const rows = await this.database.query('SELECT id FROM user WHERE email = ?', email);
    if (rows.length === 0) {
      const [{ count }] = await this.database.query('SELECT COUNT(*) AS count FROM email_update WHERE email = ?', email);
      if (count > 0) {
        throw new ErrorResponse(403, 'Unverified email address');
      }
      throw new ErrorResponse(404, 'No such user');
    }
    await ensureRateLimit(this.rateLimiter, request.ip, 'sendMail');
    const [{ id: userId }] = rows;
    const token = await this.tokenGenerator.generate();
    await this.database.update('INSERT INTO password_reset (user_id, token, expiry_time) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 48 HOUR))', [userId, token]);
    await this.database.update('DELETE FROM password_reset WHERE expiry_time < NOW()');
    sendPasswordResetEmail(this.mailer, email, token, this.resetPasswordUrl).catch(e => {
      this.logger.error(e.stack);
    });
    response.status(202).end();
  }
}

export default RequestPasswordResetRoute;
