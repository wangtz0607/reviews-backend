import RateLimitedRoute from './RateLimitedRoute';
import RateLimiter from '../rate-limiting/RateLimiter';
import Database from '../database/Database';
import { ErrorResponse } from './AbstractRoute';
import { queryClasses } from '../commons/query';
import {
  getLimitOffset,
  getClassId,
  getCourseId,
  getDepartmentId,
  getStaffId,
  ensureCourseExists,
  ensureDepartmentExists,
  ensureStaffExists
} from '../commons/helpers';

class ClassesRoute extends RateLimitedRoute {
  private readonly database: Database;

  public constructor(rateLimiter: RateLimiter, database: Database) {
    super(rateLimiter);
    this.database = database;

    this.add('GET', '/classes', this.getClasses.bind(this));
    this.add('GET', '/classes/search', this.searchClasses.bind(this));
    this.add('GET', '/classes/:classId', this.getClassById.bind(this));
    this.add('GET', '/courses/:courseId/classes', this.getClassesByCourseId.bind(this));
    this.add('GET', '/departments/:departmentId/classes', this.getClassesByDepartmentId.bind(this));
    this.add('GET', '/staffs/:staffId/classes', this.getClassesByStaffId.bind(this));
  }

  // GET /classes
  private async getClasses(request: Record<string, any>, response: Record<string, any>): Promise<void> {
    const { limit, offset } = getLimitOffset(request.query);
    response.status(200).json(await queryClasses(this.database, { limit, offset }, request.session.myUserId));
  }

  // GET /classes/search
  private async searchClasses(request: Record<string, any>, response: Record<string, any>): Promise<void> {
    const { keyword } = request.query;
    if (keyword === undefined) {
      throw new ErrorResponse(400, 'keyword required');
    }
    const { limit, offset } = getLimitOffset(request.query);
    response.status(200).json(await queryClasses(this.database, { keyword, limit, offset }, request.session.myUserId));
  }

  // GET /classes/:classId
  private async getClassById(request: Record<string, any>, response: Record<string, any>): Promise<void> {
    const classId = getClassId(request.params);
    const rows = await queryClasses(this.database, { id: classId }, request.session.myUserId);
    if (rows.length === 0) {
      throw new ErrorResponse(404, 'No such class');
    }
    response.status(200).json(rows[0]);
  }

  // GET /courses/:courseId/classes
  private async getClassesByCourseId(request: Record<string, any>, response: Record<string, any>): Promise<void> {
    const courseId = getCourseId(request.params);
    await ensureCourseExists(this.database, courseId);
    const { limit, offset } = getLimitOffset(request.query);
    response.status(200).json(await queryClasses(this.database, { courseId, limit, offset }, request.session.myUserId));
  }

  // GET /departments/:departmentId/classes
  private async getClassesByDepartmentId(request: Record<string, any>, response: Record<string, any>): Promise<void> {
    const departmentId = getDepartmentId(request.params);
    await ensureDepartmentExists(this.database, departmentId);
    const { limit, offset } = getLimitOffset(request.query);
    response.status(200).json(await queryClasses(this.database, { departmentId, limit, offset }, request.session.myUserId));
  }

  // GET /staffs/:staffId/classes
  private async getClassesByStaffId(request: Record<string, any>, response: Record<string, any>): Promise<void> {
    const staffId = getStaffId(request.params);
    await ensureStaffExists(this.database, staffId);
    const { limit, offset } = getLimitOffset(request.query);
    response.status(200).json(await queryClasses(this.database, { staffId, limit, offset }, request.session.myUserId));
  }
}

export default ClassesRoute;
