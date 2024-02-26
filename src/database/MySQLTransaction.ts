import { PoolConnection } from 'mysql2/promise';
import Transaction from './Transaction';
import RowMapper from './RowMapper';

class MySQLTransaction implements Transaction {
  private connection: PoolConnection;
  private completed = false;
  private readonly rowMapper?: RowMapper;

  public constructor(connection: PoolConnection, rowMapper?: RowMapper) {
    this.connection = connection;
    this.rowMapper = rowMapper;
  }

  public async begin(): Promise<void> {
    await this.connection.beginTransaction();
  }

  public async query(sql: string, values?: any | any[]): Promise<Record<string, any>[]> {
    let [rows,] = ((await this.connection.query(sql, values)) as any[][]);
    rows = rows.map(row => this.rowMapper?.map(row));
    return rows;
  }

  public async update(sql: string, values?: any | any[]): Promise<void> {
    await this.connection.query(sql, values);
  }

  public async commit(): Promise<void> {
    await this.connection.commit();
    this.completed = true;
  }

  public async rollback(): Promise<void> {
    await this.connection.rollback();
    this.completed = true;
  }

  public async end(): Promise<void> {
    if (!this.completed) {
      await this.rollback();
    }
    this.connection.release();
  }
}

export default MySQLTransaction;
