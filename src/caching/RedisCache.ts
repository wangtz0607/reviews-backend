import Redis from 'ioredis';
import Cache from './Cache';

class RedisCache implements Cache {
  private client: Redis;

  public constructor(client: Redis) {
    this.client = client;
  }

  public async get(key: string): Promise<string | undefined> {
    return await this.client.get(key) ?? undefined;
  }

  public async set(key: string, value: string, ttl = Infinity): Promise<void> {
    await this.client.set(key, value);
    if (ttl < Infinity) {
      await this.client.expire(key, ttl);
    }
  }

  public async increment(key: string): Promise<number> {
    return await this.client.incr(key);
  }

  public async expire(key: string, ttl: number): Promise<void> {
    await this.client.expire(key, ttl);
  }

  public async delete(key: string): Promise<void> {
    await this.client.del(key);
  }

  public async close(): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      this.client.quit(error => {
        if (error) reject(error); else resolve();
      });
    });
  }
}

export default RedisCache;
