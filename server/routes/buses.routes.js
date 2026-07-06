const { createCrudRouter } = require('../utils/crudFactory');
module.exports = createCrudRouter({ table: 'buses', idPrefix: 'B', orderBy: 'id' });
