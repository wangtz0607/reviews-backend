import RateLimitedRoute from './RateLimitedRoute';
import RateLimiter from '../rate-limiting/RateLimiter';
import Database from '../database/Database';

class StatsRoute extends RateLimitedRoute {
  private database: Database;

  public constructor(rateLimiter: RateLimiter, database: Database) {
    super(rateLimiter);
    this.database = database;

    this.add('GET', '/stats', this.getStats.bind(this));
  }

  // GET /stats
  private async getStats(request: Record<string, any>, response: Record<string, any>): Promise<void> {
    response.status(200).json((await this.database.query(`
      SELECT
        (SELECT COUNT(*) FROM review) AS num_reviews,
        (SELECT COUNT(*) FROM class) AS num_classes,
        (SELECT COUNT(*) FROM course) AS num_courses,
        (SELECT COUNT(*) FROM staff) AS num_staffs,
        (SELECT COUNT(*) FROM department) AS num_departments,
        (SELECT COUNT(*) FROM user) AS num_users`))[0]);
  }
}

export default StatsRoute;
