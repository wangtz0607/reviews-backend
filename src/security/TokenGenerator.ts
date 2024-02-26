interface TokenGenerator {
  generate(): Promise<string>;
}

export default TokenGenerator;
