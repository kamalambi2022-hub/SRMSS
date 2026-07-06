const { createCrudRouter } = require('../utils/crudFactory');
module.exports = createCrudRouter({ table: 'drivers', idPrefix: 'D', orderBy: 'id' });
