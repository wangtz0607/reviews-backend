interface RowMapper {
  map(row: Record<string, any>): Record<string, any>;
}

export default RowMapper;
