interface PasswordEncoder {
  encode(password: string): Promise<string>;
  compare(password: string, passwordHash: string): Promise<boolean>;
}

export default PasswordEncoder;
