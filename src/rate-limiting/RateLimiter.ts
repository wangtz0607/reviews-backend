import Closeable from '../commons/Closeable';

interface RateLimiter extends Closeable {
  setLimit(action: string, limit: any): void;
  check(identifiers: any | any[], action: string): Promise<boolean>;
  close(): Promise<void>;
}

export default RateLimiter;
