import _ from 'lodash';

import RowMapper from './RowMapper';

class CamelCaseKeyRowMapper implements RowMapper {
  public map(row: Record<string, any>): Record<string, any> {
    return _.mapKeys(row, (value, key) => _.camelCase(key));
  }
}

export default CamelCaseKeyRowMapper;
