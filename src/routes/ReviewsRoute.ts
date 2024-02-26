import RateLimitedRoute from './RateLimitedRoute';
import RateLimiter from '../rate-limiting/RateLimiter';
import Database from '../database/Database';
import { ErrorResponse } from './AbstractRoute';
import { queryReviews } from '../commons/query';
import {
  ensureYearValid,
  ensureSemesterValid,
  ensureRatingValid,
  ensureReviewValid,
  ensureLoggedIn,
  getLimitOffset,
  getClassId,
  getReviewId,
  getUserId,
  ensureClassExists,
  ensureUserExists,
  ensureRateLimit
} from '../commons/helpers';

class ReviewsRoute extends RateLimitedRoute {
  private readonly database: Database;

  public constructor(rateLimiter: RateLimiter, database: Database) {
    super(rateLimiter);
    this.database = database;

    this.add('GET', '/reviews', this.getReviews.bind(this));
    this.add('GET', '/classes/:classId/reviews', this.getReviewsByClassId.bind(this));
    this.add('GET', '/users/:userId/reviews', this.getReviewsByUserId.bind(this));
    this.add('POST', '/classes/:classId/reviews', this.createReview.bind(this));
    this.add('DELETE', '/reviews/:reviewId', this.deleteReview.bind(this));
  }

  // GET /reviews
  private async getReviews(request: Record<string, any>, response: Record<string, any>): Promise<void> {
    const { limit, offset } = getLimitOffset(request.query);
    response.status(200).json(await queryReviews(this.database, { limit, offset }, request.session.myUserId));
  }

  // GET /classes/:classId/reviews
  private async getReviewsByClassId(request: Record<string, any>, response: Record<string, any>): Promise<void> {
    const classId = getClassId(request.params);
    await ensureClassExists(this.database, classId);
    const { limit, offset } = getLimitOffset(request.query);
    response.status(200).json(await queryReviews(this.database, { classId, limit, offset }, request.session.myUserId));
  }

  // GET /users/:userId/reviews
  private async getReviewsByUserId(request: Record<string, any>, response: Record<string, any>): Promise<void> {
    const userId = getUserId(request.params);
    await ensureUserExists(this.database, userId);
    const { limit, offset } = getLimitOffset(request.query);
    response.status(200).json(await queryReviews(this.database, { userId, noAnonymous: true, limit, offset }, request.session.myUserId));
  }

  // POST /classes/:classId/reviews
  private async createReview(request: Record<string, any>, response: Record<string, any>): Promise<void> {
    const classId = getClassId(request.params);
    await ensureClassExists(this.database, classId);
    ensureLoggedIn(request.session);
    const myUserId = request.session.myUserId;
    const { year, semester, rating, review, anonymous } = request.body;
    if (typeof year !== 'number') {
      throw new ErrorResponse(400, 'Invalid year');
    }
    if (typeof semester !== 'string') {
      throw new ErrorResponse(400, 'Invalid semester');
    }
    if (typeof rating !== 'number') {
      throw new ErrorResponse(400, 'Invalid rating');
    }
    if (typeof review !== 'string') {
      throw new ErrorResponse(400, 'Invalid review');
    }
    if (typeof anonymous !== 'boolean') {
      throw new ErrorResponse(400, 'Invalid anonymous');
    }
    ensureYearValid(year);
    ensureSemesterValid(semester);
    ensureRatingValid(rating);
    ensureReviewValid(review);
    const transaction = await this.database.newTransaction();
    await transaction.begin();
    try {
      const [{ count }] = await transaction.query('SELECT COUNT(*) AS count FROM review WHERE class_id = ? AND user_id = ?', [classId, myUserId]);
      if (count > 0) {
        throw new ErrorResponse(409, 'Cannot publish multiple reviews on a class');
      }
      await ensureRateLimit(this.rateLimiter, [request.ip, myUserId], 'createReview');
      await transaction.update('INSERT INTO review (user_id, class_id, year, semester, rating, review, anonymous, time) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())', [myUserId, classId, year, semester, rating, review, anonymous]);
      await transaction.commit();
    } finally {
      await transaction.end();
    }
    response.status(201).end();
  }

  // DELETE /reviews/:reviewId
  private async deleteReview(request: Record<string, any>, response: Record<string, any>): Promise<void> {
    const reviewId = getReviewId(request.params);
    const reviews = await this.database.query('SELECT user_id FROM review WHERE id = ?', reviewId);
    if (reviews.length === 0) {
      throw new ErrorResponse(404, 'No such review');
    }
    ensureLoggedIn(request.session);
    const myUserId = request.session.myUserId;
    const [{ userId }] = reviews;
    if (userId !== myUserId) {
      throw new ErrorResponse(403, 'You can only delete your own reviews');
    }
    await this.database.update('DELETE FROM review WHERE id = ?', reviewId);
    response.status(204).end();
  }
}

export default ReviewsRoute;
