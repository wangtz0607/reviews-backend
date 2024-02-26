class Captcha {
  public readonly mimeType: string;
  public readonly text: string;
  public readonly buffer: Buffer;

  public constructor(mimeType: string, text: string, buffer: Buffer) {
    this.mimeType = mimeType;
    this.text = text;
    this.buffer = buffer;
  }
}

export default Captcha;
