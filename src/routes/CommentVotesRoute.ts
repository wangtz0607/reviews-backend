import RateLimitedRoute from './RateLimitedRoute';
import RateLimiter from '../rate-limiting/RateLimiter';
import Database from '../database/Database';
import { ErrorResponse } from './AbstractRoute';
import { commentVoteExists } from '../commons/query';
import {
  ensureVoteValid,
  ensureLoggedIn,
  getCommentId,
  ensureCommentExists,
  ensureCommentVoteExists,
} from '../commons/helpers';

class CommentVotesRoute extends RateLimitedRoute {
  private readonly database: Database;

  public constructor(rateLimiter: RateLimiter, database: Database) {
    super(rateLimiter);
    this.database = database;

    this.add('PUT', '/comments/:commentId/vote', this.createVote.bind(this));
    this.add('DELETE', '/comments/:commentId/vote', this.deleteVote.bind(this));
  }

  // PUT /comments/:commentId/vote
  private async createVote(request: Record<string, any>, response: Record<string, any>): Promise<void> {
    const commentId = getCommentId(request.params);
    const rows = await this.database.query('SELECT user_id FROM comment WHERE id = ?', commentId);
    if (rows.length === 0) {
      throw new ErrorResponse(404, 'No such comment');
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
      throw new ErrorResponse(403, 'Cannot vote on your own comments');
    }
    const transaction = await this.database.newTransaction();
    await transaction.begin();
    try {
      if (await commentVoteExists(transaction, commentId, myUserId)) {
        throw new ErrorResponse(409, 'Cannot vote on a comment twice');
      }
      await transaction.update('INSERT INTO comment_vote (user_id, comment_id, vote) VALUES (?, ?, ?)', [myUserId, commentId, vote]);
      await transaction.commit();
      response.status(201).end();
    } finally {
      await transaction.end();
    }
  }

  // DELETE /comments/:commentId/vote
  private async deleteVote(request: Record<string, any>, response: Record<string, any>): Promise<void> {
    const commentId = getCommentId(request.params);
    await ensureCommentExists(this.database, commentId);
    ensureLoggedIn(request.session);
    const myUserId = request.session.myUserId;
    await ensureCommentVoteExists(this.database, commentId, myUserId);
    await this.database.update('DELETE FROM comment_vote WHERE user_id = ? AND comment_id = ?', [myUserId, commentId]);
    response.status(204).end();
  }
}

export default CommentVotesRoute;
