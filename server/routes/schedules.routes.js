const { createCrudRouter } = require('../utils/crudFactory');
module.exports = createCrudRouter({ table: 'schedules', idPrefix: 'S', orderBy: 'date DESC, departure_time' });
