const { createCrudRouter } = require('../utils/crudFactory');
module.exports = createCrudRouter({ table: 'audit_logs', idPrefix: 'A', orderBy: 'timestamp DESC' });
