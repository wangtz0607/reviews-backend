import winston from 'winston';
import Logger from './Logger';

class DefaultLogger implements Logger {
  private logger: winston.Logger;

  public constructor(logger: winston.Logger) {
    this.logger = logger;
  }

  public debug(message: string): void {
    this.logger.debug(message);
  }

  public info(message: string): void {
    this.logger.info(message);
  }

  public warning(message: string): void {
    this.logger.warn(message);
  }

  public error(message: string): void {
    this.logger.error(message);
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  public async close(): Promise<void> {}
}

export default DefaultLogger;
