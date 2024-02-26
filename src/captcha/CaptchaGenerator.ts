import Captcha from './Captcha';

interface CaptchaGenerator {
  generate(): Captcha;
}

export default CaptchaGenerator;
