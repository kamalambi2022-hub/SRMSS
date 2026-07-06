const { createCrudRouter } = require('../utils/crudFactory');
module.exports = createCrudRouter({ table: 'routes', idPrefix: 'R', orderBy: 'id' });
