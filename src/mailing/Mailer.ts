import Closeable from '../commons/Closeable';

interface Mailer extends Closeable {
  send(to: string, subject: string, html: string): Promise<void>;
}

export default Mailer;
