import RateLimitedRoute from './RateLimitedRoute';
import RateLimiter from '../rate-limiting/RateLimiter';
import Database from '../database/Database';
import { ErrorResponse } from './AbstractRoute';
import { queryDepartments } from '../commons/query';
import {
  getLimitOffset,
  getDepartmentId,
} from '../commons/helpers';

class DepartmentsRoute extends RateLimitedRoute {
  private readonly database: Database;

  public constructor(rateLimiter: RateLimiter, database: Database) {
    super(rateLimiter);
    this.database = database;

    this.add('GET', '/departments', this.getDepartments.bind(this));
    this.add('GET', '/departments/search', this.searchDepartments.bind(this));
    this.add('GET', '/departments/:departmentId', this.getDepartmentById.bind(this));
  }

  // GET /departments
  private async getDepartments(request: Record<string, any>, response: Record<string, any>): Promise<void> {
    const { limit, offset } = getLimitOffset(request.query);
    response.status(200).json(await queryDepartments(this.database, { limit, offset }));
  }

  // GET /departments/search
  private async searchDepartments(request: Record<string, any>, response: Record<string, any>): Promise<void> {
    const { keyword } = request.query;
    if (keyword === undefined) {
      throw new ErrorResponse(400, 'keyword required');
    }
    const { limit, offset } = getLimitOffset(request.query);
    response.status(200).json(await queryDepartments(this.database, { keyword, limit, offset }));
  }

  // GET /departments/:departmentId
  private async getDepartmentById(request: Record<string, any>, response: Record<string, any>): Promise<void> {
    const departmentId = getDepartmentId(request.params);
    const rows = await queryDepartments(this.database, { id: departmentId });
    if (rows.length === 0) {
      throw new ErrorResponse(404, 'No such department');
    }
    response.status(200).json(rows[0]);
  }
}

export default DepartmentsRoute;
