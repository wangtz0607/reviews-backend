import Cache from './Cache';

class MemoryCache implements Cache {
  private store: Map<string, { value: string, expiry: number }> = new Map<string, { value: string, expiry: number }>();

  public async get(key: string): Promise<string | undefined> {
    const valueAndExpiry = this.store.get(key);
    if (valueAndExpiry !== undefined) {
      const { value, expiry } = valueAndExpiry;
      if (expiry > Date.now()) {
        return value;
      }
    }
    return undefined;
  }

  public async set(key: string, value: string, ttl = Infinity): Promise<void> {
    this.store.set(key, { value, expiry: Date.now() + ttl * 1000 });
  }

  public async increment(key: string): Promise<number> {
    const newValue = +((await this.get(key)) ?? 0) + 1;
    await this.set(key, newValue.toString());
    return newValue;
  }

  public async expire(key: string, ttl: number): Promise<void> {
    const valueAndExpiry = this.store.get(key);
    if (valueAndExpiry !== undefined) {
      valueAndExpiry.expiry = Date.now() + ttl * 1000;
    }
  }

  public async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  public async close(): Promise<void> {}
}

export default MemoryCache;
