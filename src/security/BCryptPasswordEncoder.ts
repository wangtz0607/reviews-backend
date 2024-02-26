import bcrypt from 'bcrypt';
import PasswordEncoder from './PasswordEncoder';

class BCryptPasswordEncoder implements PasswordEncoder {
  private readonly rounds: number;

  public constructor(rounds: number) {
    this.rounds = rounds;
  }

  public async encode(password: string): Promise<string> {
    return await bcrypt.hash(password, await bcrypt.genSalt(this.rounds));
  }

  public async compare(password: string, passwordHash: string): Promise<boolean> {
    return await bcrypt.compare(password, passwordHash);
  }
}

export default BCryptPasswordEncoder;
