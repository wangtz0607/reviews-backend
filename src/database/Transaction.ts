interface Transaction {
  begin(): Promise<void>;
  query(sql: string, values?: any | any[]): Promise<Record<string, any>[]>;
  update(sql: string, values?: any | any[]): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
  end(): Promise<void>;
}

export default Transaction;
