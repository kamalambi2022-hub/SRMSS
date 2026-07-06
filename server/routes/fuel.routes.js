const { createCrudRouter } = require('../utils/crudFactory');
module.exports = createCrudRouter({ table: 'fuel_logs', idPrefix: 'F', orderBy: 'date DESC' });
