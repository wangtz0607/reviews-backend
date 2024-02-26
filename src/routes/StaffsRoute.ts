import RateLimitedRoute from './RateLimitedRoute';
import RateLimiter from '../rate-limiting/RateLimiter';
import Database from '../database/Database';
import { ErrorResponse } from './AbstractRoute';
import { queryStaffs } from '../commons/query';
import {
  getLimitOffset,
  getStaffId,
} from '../commons/helpers';

class StaffsRoute extends RateLimitedRoute {
  private readonly database: Database;

  public constructor(rateLimiter: RateLimiter, database: Database) {
    super(rateLimiter);
    this.database = database;

    this.add('GET', '/staffs', this.getStaffs.bind(this));
    this.add('GET', '/staffs/search', this.searchStaffs.bind(this));
    this.add('GET', '/staffs/:staffId', this.getStaffById.bind(this));
  }

  // GET /staffs
  private async getStaffs(request: Record<string, any>, response: Record<string, any>): Promise<void> {
    const { limit, offset } = getLimitOffset(request.query);
    response.status(200).json(await queryStaffs(this.database, { limit, offset }));
  }

  // GET /staffs/search
  private async searchStaffs(request: Record<string, any>, response: Record<string, any>): Promise<void> {
    const { keyword } = request.query;
    if (keyword === undefined) {
      throw new ErrorResponse(400, 'keyword required');
    }
    const { limit, offset } = getLimitOffset(request.query);
    response.status(200).json(await queryStaffs(this.database, { keyword, limit, offset }));
  }

  // GET /staffs/:staffId
  private async getStaffById(request: Record<string, any>, response: Record<string, any>): Promise<void> {
    const staffId = getStaffId(request.params);
    const rows = await queryStaffs(this.database, { id: staffId });
    if (rows.length === 0) {
      throw new ErrorResponse(404, 'No such staff');
    }
    response.status(200).json(rows[0]);
  }
}

export default StaffsRoute;
