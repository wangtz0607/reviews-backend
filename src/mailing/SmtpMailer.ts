import { Transporter } from 'nodemailer';
import Mailer from './Mailer';
import Logger from '../logging/Logger';

class SmtpMailer implements Mailer {
  private logger: Logger;
  private transporter: Transporter;
  private readonly from: string;

  public constructor(logger: Logger, transporter: Transporter, from: string) {
    this.logger = logger;
    this.transporter = transporter;
    this.from = from;
  }

  public async send(to: string, subject: string, html: string): Promise<void> {
    this.logger.debug(`${this.constructor.name}: to=${to} subject=${subject} html=${html}`);
    await this.transporter.sendMail({
      from: this.from,
      to,
      subject,
      html
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  public async close(): Promise<void> {}
}

export default SmtpMailer;
