import _ from 'lodash';
import { createCanvas } from 'canvas';
import CaptchaGenerator from './CaptchaGenerator';
import Captcha from './Captcha';

class DefaultCaptchaGenerator implements CaptchaGenerator {
  public generate(): Captcha {
    const text = _.times(6, () => _.sample([...'ABCDEFGHIJKLMNPQRSTUVWXYZ'])).join('');
    const canvas = createCanvas(600, 200);
    const ctx = canvas.getContext('2d', { alpha: false });
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.transform(1, _.random(-0.25, 0.25), _.random(-0.25, 0.25), 1, 300, 100);
    ctx.fillStyle = ctx.strokeStyle = _.sample(['#e91e63', '#2196f3', '#00bcd4', '#009688', '#ff5722'])!;
    ctx.lineWidth = 5;
    ctx.font = '96px "Action Jackson"';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 0, 0);
    ctx.moveTo(-300, 0);
    ctx.bezierCurveTo(-100, _.random(-25, 25), 100, _.random(-25, 25), 300, 0);
    ctx.stroke();
    return new Captcha('image/png', text, canvas.toBuffer());
  }
}

export default DefaultCaptchaGenerator;
