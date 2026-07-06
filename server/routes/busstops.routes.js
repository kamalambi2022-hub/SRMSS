const { createCrudRouter } = require('../utils/crudFactory');
module.exports = createCrudRouter({ table: 'bus_stops', idPrefix: 'BS', orderBy: 'id' });
