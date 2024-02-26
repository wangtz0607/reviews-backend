import Closeable from '../commons/Closeable';

interface Logger extends Closeable {
  debug(message: string): void;
  info(message: string): void;
  warning(message: string): void;
  error(message: string): void;
}

export default Logger;
