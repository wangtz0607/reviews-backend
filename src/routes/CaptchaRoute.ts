import RateLimitedRoute from './RateLimitedRoute';
import RateLimiter from '../rate-limiting/RateLimiter';
import CaptchaGenerator from '../captcha/CaptchaGenerator';

class CaptchaRoute extends RateLimitedRoute {
  private captchaGenerator: CaptchaGenerator;

  public constructor(rateLimiter: RateLimiter, captchaGenerator: CaptchaGenerator) {
    super(rateLimiter);
    this.captchaGenerator = captchaGenerator;

    this.add('GET', '/captcha', this.getCaptcha.bind(this));
  }

  // GET /captcha
  private async getCaptcha(request: Record<string, any>, response: Record<string, any>): Promise<void> {
    const { mimeType, text, buffer } = this.captchaGenerator.generate();
    request.session.captchaText = text;
    response.set('Cache-Control', 'no-store').status(200).type(mimeType).send(buffer);
  }
}

export default CaptchaRoute;
