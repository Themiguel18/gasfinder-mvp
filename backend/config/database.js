const bcrypt = require('bcryptjs');

const bottles = [
  { id: 1, name: 'Botija Azul', color: 'blue', weight: '18kg', status: 'active' },
  { id: 2, name: 'Botija Laranja', color: 'orange', weight: '13kg', status: 'active' },
  { id: 3, name: 'Botija Verde', color: 'green', weight: '45kg', status: 'active' }
];

const users = [
  { id: 1, name: 'Administrador', email: 'admin@gasfinder.app', password: bcrypt.hashSync('admin123', 10), role: 'admin' },
  { id: 2, name: 'Cliente Teste', email: 'cliente@gasfinder.app', password: bcrypt.hashSync('cliente123', 10), role: 'client' }
];

const agencies = [
  {
    id: 1,
    name: 'Agência São José',
    responsible: 'Carlos Silva',
    phone: '923111222',
    email: 'saojose@gasfinder.app',
    password: bcrypt.hashSync('agencia123', 10),
    address: 'Bairro Central, Luanda',
    latitude: -8.84,
    longitude: 13.23,
    status: 'active',
    verified: 1,
    created_at: new Date().toISOString()
  }
];

const schedules = [
  { id: 1, agency_id: 1, day_of_week: 'Segunda', open_time: '07:00', close_time: '18:00' },
  { id: 2, agency_id: 1, day_of_week: 'Terça', open_time: '07:00', close_time: '18:00' }
];

const availability = [
  { id: 1, agency_id: 1, bottle_id: 1, available: 1, price: 8500, updated_at: new Date(Date.now() - 5 * 60000).toISOString() },
  { id: 2, agency_id: 1, bottle_id: 2, available: 0, price: 8200, updated_at: new Date(Date.now() - 60 * 60000).toISOString() },
  { id: 3, agency_id: 1, bottle_id: 3, available: 1, price: 15000, updated_at: new Date(Date.now() - 10 * 60000).toISOString() }
];

const settings = { stale_hours: '9' };

const database = {
  bottles,
  users,
  agencies,
  schedules,
  availability,
  settings,
  searches: []
};

module.exports = database;
