import { randomBytes } from 'crypto';
import { promisify } from 'util';
import TokenGenerator from './TokenGenerator';

class DefaultTokenGenerator implements TokenGenerator {
  private size: number;

  public constructor(size: number) {
    this.size = size;
  }

  public async generate(): Promise<string> {
    return (await promisify(randomBytes)(this.size)).toString('hex');
  }
}

export default DefaultTokenGenerator;
