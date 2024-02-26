import Closeable from '../commons/Closeable';

interface Cache extends Closeable {
  get(key: string): Promise<string | undefined>;
  set(key: string, value: string, ttl?: number): Promise<void>;
  increment(key: string): Promise<number>;
  expire(key: string, ttl: number): Promise<void>;
  delete(key: string): Promise<void>;
}

export default Cache;
