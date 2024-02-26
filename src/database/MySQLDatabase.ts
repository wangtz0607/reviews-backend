import { Pool } from 'mysql2/promise';
import Database from './Database';
import Transaction from './Transaction';
import RowMapper from './RowMapper';
import MySQLTransaction from './MySQLTransaction';

class MySQLDatabase implements Database {
  private promisePool: Pool;
  private rowMapper?: RowMapper;

  public constructor(promisePool: Pool) {
    this.promisePool = promisePool;
  }

  public setRowMapper(rowMapper?: RowMapper) {
    this.rowMapper = rowMapper;
  }

  public async query(sql: string, values?: any | any[]): Promise<Record<string, any>[]> {
    let [rows,] = (await this.promisePool.query(sql, values)) as any[][];
    rows = rows.map(row => this.rowMapper?.map(row));
    return rows;
  }

  public async update(sql: string, values?: any | any[]): Promise<void> {
    await this.promisePool.query(sql, values);
  }

  public async newTransaction(): Promise<Transaction> {
    return new MySQLTransaction(await this.promisePool.getConnection(), this.rowMapper);
  }

  public async close(): Promise<void> {
    await this.promisePool.end();
  }
}

export default MySQLDatabase;
