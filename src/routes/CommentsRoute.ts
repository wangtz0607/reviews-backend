import RateLimitedRoute from './RateLimitedRoute';
import RateLimiter from '../rate-limiting/RateLimiter';
import Database from '../database/Database';
import { ErrorResponse } from './AbstractRoute';
import { queryComments } from '../commons/query';
import {
  ensureCommentValid,
  ensureLoggedIn,
  getLimitOffset,
  getCommentId,
  getReviewId,
  ensureReviewExists,
  ensureRateLimit
} from '../commons/helpers';

class CommentsRoute extends RateLimitedRoute {
  private readonly database: Database;

  public constructor(rateLimiter: RateLimiter, database: Database) {
    super(rateLimiter);
    this.database = database;

    this.add('GET', '/reviews/:reviewId/comments', this.getCommentsByReviewId.bind(this));
    this.add('POST', '/reviews/:reviewId/comments', this.createComment.bind(this));
    this.add('DELETE', '/comments/:commentId', this.deleteComment.bind(this));
  }

  // GET /reviews/:reviewId/comments
  private async getCommentsByReviewId(request: Record<string, any>, response: Record<string, any>): Promise<void> {
    const reviewId = getReviewId(request.params);
    await ensureReviewExists(this.database, reviewId);
    const { limit, offset } = getLimitOffset(request.query);
    response.status(200).json(await queryComments(this.database, { reviewId, limit, offset }, request.session.myUserId));
  }

  // POST /reviews/:reviewId/comments
  private async createComment(request: Record<string, any>, response: Record<string, any>): Promise<void> {
    const reviewId = getReviewId(request.params);
    await ensureReviewExists(this.database, reviewId);
    ensureLoggedIn(request.session);
    const myUserId = request.session.myUserId;
    const { comment } = request.body;
    if (typeof comment !== 'string') {
      throw new ErrorResponse(400, 'Invalid comment');
    }
    ensureCommentValid(comment);
    await ensureRateLimit(this.rateLimiter, [request.ip, myUserId], 'createComment');
    await this.database.update('INSERT INTO comment (user_id, review_id, comment, time) VALUES (?, ?, ?, NOW())', [myUserId, reviewId, comment]);
    response.status(201).end();
  }

  // DELETE /comments/:commentId
  private async deleteComment(request: Record<string, any>, response: Record<string, any>): Promise<void> {
    const commentId = getCommentId(request.params);
    const rows = await this.database.query('SELECT user_id FROM comment WHERE id = ?', commentId);
    if (rows.length === 0) {
      throw new ErrorResponse(404, 'No such comment');
    }
    ensureLoggedIn(request.session);
    const myUserId = request.session.myUserId;
    const [{ userId }] = rows;
    if (userId !== myUserId) {
      throw new ErrorResponse(403, 'You can only delete your own comments');
    }
    await this.database.update('DELETE FROM comment WHERE id = ?', commentId);
    response.status(204).end();
  }
}

export default CommentsRoute;
