import RateLimitedRoute from './RateLimitedRoute';
import RateLimiter from '../rate-limiting/RateLimiter';
import Database from '../database/Database';
import { ErrorResponse } from './AbstractRoute';
import { reviewVoteExists } from '../commons/query';
import {
  ensureVoteValid,
  ensureLoggedIn,
  getReviewId,
  ensureReviewExists,
} from '../commons/helpers';

class ReviewVotesRoute extends RateLimitedRoute {
  private readonly database: Database;

  public constructor(rateLimiter: RateLimiter, database: Database) {
    super(rateLimiter);
    this.database = database;

    this.add('PUT', '/reviews/:reviewId/vote', this.createVote.bind(this));
    this.add('DELETE', '/reviews/:reviewId/vote', this.deleteVote.bind(this));
  }

  // PUT /reviews/:reviewId/vote
  private async createVote(request: Record<string, any>, response: Record<string, any>): Promise<void> {
    const reviewId = getReviewId(request.params);
    const rows = await this.database.query('SELECT user_id FROM review WHERE id = ?', reviewId);
    if (rows.length === 0) {
      throw new ErrorResponse(404, 'No such review');
    }
    ensureLoggedIn(request.session);
    const myUserId = request.session.myUserId;
    const { vote } = request.body;
    if (typeof vote !== 'string') {
      throw new ErrorResponse(400, 'Invalid vote');
    }
    ensureVoteValid(vote);
    const [{ userId }] = rows;
    if (userId === myUserId) {
      throw new ErrorResponse(403, 'Cannot vote on your own reviews');
    }
    const transaction = await this.database.newTransaction();
    await transaction.begin();
    try {
      if (await reviewVoteExists(transaction, reviewId, myUserId)) {
        throw new ErrorResponse(409, 'Cannot vote on a review twice');
      }
      await transaction.update('INSERT INTO review_vote (user_id, review_id, vote) VALUES (?, ?, ?)', [myUserId, reviewId, vote]);
      await transaction.commit();
    } finally {
      await transaction.end();
    }
    response.status(201).end();
  }

  // DELETE /reviews/:reviewId/vote
  private async deleteVote(request: Record<string, any>, response: Record<string, any>): Promise<void> {
    const reviewId = getReviewId(request.params);
    await ensureReviewExists(this.database, reviewId);
    ensureLoggedIn(request.session);
    const myUserId = request.session.myUserId;
    if (!await reviewVoteExists(this.database, reviewId, myUserId)) {
      throw new ErrorResponse(404, 'No such vote');
    }
    await this.database.update('DELETE FROM review_vote WHERE user_id = ? AND review_id = ?', [myUserId, reviewId]);
    response.status(204).end();
  }
}

export default ReviewVotesRoute;
