import AbstractRoute, { Method } from './AbstractRoute';
import RateLimiter from '../rate-limiting/RateLimiter';
import { ensureRateLimit } from '../commons/helpers';

abstract class RateLimitedRoute extends AbstractRoute {
  protected rateLimiter: RateLimiter;

  protected constructor(rateLimiter: RateLimiter) {
    super();
    this.rateLimiter = rateLimiter;
  }

  protected add(method: Method, path: string, handler: (request: Record<string, any>, response: Record<string, any>) => Promise<void>): void {
    super.add(method, path, async (request, response) => {
      await ensureRateLimit(this.rateLimiter, request.ip, 'default');
      await handler(request, response);
    });
  }
}

export default RateLimitedRoute;
