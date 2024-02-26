import Mailer from './Mailer';
import Logger from '../logging/Logger';

class NopMailer implements Mailer {
  private logger: Logger;

  public constructor(logger: Logger) {
    this.logger = logger;
  }

  public async send(to: string, subject: string, html: string): Promise<void> {
    this.logger.debug(`${this.constructor.name}: to=${to} subject=${subject} html=${html}`);
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  public async close(): Promise<void> {}
}

export default NopMailer;
