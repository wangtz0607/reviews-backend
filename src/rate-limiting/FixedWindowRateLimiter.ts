import Cache from '../caching/Cache';
import RateLimiter from './RateLimiter';

class FixedWindowLimit {
  public readonly windowSize: number;
  public readonly maxRequests: number;

  public constructor(windowSize: number, maxRequests: number) {
    this.windowSize = windowSize;
    this.maxRequests = maxRequests;
  }
}

class FixedWindowRateLimiter implements RateLimiter {
  private cache: Cache;
  private limits: Map<string, FixedWindowLimit> = new Map<string, FixedWindowLimit>();

  public constructor(cache: Cache) {
    this.cache = cache;
  }

  public setLimit(action: string, limit: FixedWindowLimit): void {
    this.limits.set(action, limit);
  }

  public async check(identifiers: any | any[], action: string): Promise<boolean> {
    if (!Array.isArray(identifiers)) {
      identifiers = [identifiers];
    }
    for (const identifier of identifiers) {
      const limit = this.limits.get(action);
      if (limit !== undefined) {
        const key = `${identifier}:${action}:${Math.floor(Date.now() / 1000 / limit.windowSize)}`;
        if (await this.cache.get(key) === undefined) {
          await this.cache.set(key, '0');
          await this.cache.expire(key, limit.windowSize);
        }
        if (await this.cache.increment(key) > limit.maxRequests) {
          return false;
        }
      }
    }
    return true;
  }

  public async close(): Promise<void> {
    await this.cache.close();
  }
}

export { FixedWindowLimit };
export default FixedWindowRateLimiter;
