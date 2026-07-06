const { createCrudRouter } = require('../utils/crudFactory');
module.exports = createCrudRouter({ table: 'maintenance_logs', idPrefix: 'M', orderBy: 'date DESC' });
