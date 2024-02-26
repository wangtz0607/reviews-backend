import RateLimitedRoute from './RateLimitedRoute';
import RateLimiter from '../rate-limiting/RateLimiter';
import Database from '../database/Database';
import { ErrorResponse } from './AbstractRoute';
import { queryCourses } from '../commons/query';
import {
  getLimitOffset,
  getCourseId,
  getDepartmentId,
  ensureDepartmentExists,
} from '../commons/helpers';

class CoursesRoute extends RateLimitedRoute {
  private readonly database: Database;

  public constructor(rateLimiter: RateLimiter, database: Database) {
    super(rateLimiter);
    this.database = database;

    this.add('GET', '/courses', this.getCourses.bind(this));
    this.add('GET', '/courses/search', this.searchCourses.bind(this));
    this.add('GET', '/courses/:courseId', this.getCourseById.bind(this));
    this.add('GET', '/departments/:departmentId/courses', this.getCoursesByDepartmentId.bind(this));
  }

  // GET /courses
  private async getCourses(request: Record<string, any>, response: Record<string, any>): Promise<void> {
    const { limit, offset } = getLimitOffset(request.query);
    response.status(200).json(await queryCourses(this.database, { limit, offset }));
  }

  // GET /courses/search
  private async searchCourses(request: Record<string, any>, response: Record<string, any>): Promise<void> {
    const { keyword } = request.query;
    if (keyword === undefined) {
      throw new ErrorResponse(400, 'keyword required');
    }
    const { limit, offset } = getLimitOffset(request.query);
    response.status(200).json(await queryCourses(this.database, { keyword, limit, offset }));
  }

  // GET /courses/:courseId
  private async getCourseById(request: Record<string, any>, response: Record<string, any>): Promise<void> {
    const courseId = getCourseId(request.params);
    const rows = await queryCourses(this.database, { id: courseId });
    if (rows.length === 0) {
      throw new ErrorResponse(404, 'No such course');
    }
    response.status(200).json(rows[0]);
  }

  // GET /departments/:departmentId/courses
  private async getCoursesByDepartmentId(request: Record<string, any>, response: Record<string, any>): Promise<void> {
    const departmentId = getDepartmentId(request.params);
    await ensureDepartmentExists(this.database, departmentId);
    const { limit, offset } = getLimitOffset(request.query);
    response.status(200).json(await queryCourses(this.database, { departmentId, limit, offset }));
  }
}

export default CoursesRoute;
