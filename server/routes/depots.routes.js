const { createCrudRouter } = require('../utils/crudFactory');
module.exports = createCrudRouter({ table: 'depots', idPrefix: 'DEP', orderBy: 'name' });
