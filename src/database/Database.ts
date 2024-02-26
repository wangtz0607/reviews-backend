import Closeable from '../commons/Closeable';
import Transaction from './Transaction';
import RowMapper from './RowMapper';

interface Database extends Closeable {
  setRowMapper(rowMapper: RowMapper): void;
  query(sql: string, values?: any | any[]): Promise<Record<string, any>[]>;
  update(sql: string, values?: any | any[]): Promise<void>;
  newTransaction(): Promise<Transaction>;
}

export default Database;
