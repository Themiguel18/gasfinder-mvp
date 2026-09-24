const test = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');

const { calculateDistanceKm, buildSearchRadiusPlan, filterAvailableBottles } = require('../backend/services/searchService');
const { findLoginUser, login } = require('../backend/controllers/authController');

test('calculateDistanceKm returns a reasonable distance in kilometers', () => {
  const distance = calculateDistanceKm(-8.84, 13.23, -8.84, 13.25);
  assert.ok(distance > 0);
  assert.ok(distance < 5);
});

test('search radius plan progresses from 2km to 5km and 10km', () => {
  const plan = buildSearchRadiusPlan();
  assert.deepEqual(plan, [2, 5, 10]);
});

const inventory = [
  { id: 'azul', bottleName: 'Botija Azul', available: 1 },
  { id: 'laranja', bottleName: 'Botija Laranja', available: 1 }
];

test('filters only agencies with blue bottle available', () => {
  assert.deepEqual(filterAvailableBottles([inventory[0]], 'azul').map((item) => item.id), ['azul']);
  assert.deepEqual(filterAvailableBottles([{ ...inventory[1], available: 1 }], 'azul'), []);
});

test('filters only agencies with orange bottle available', () => {
  assert.deepEqual(filterAvailableBottles([inventory[0]], 'laranja'), []);
  assert.deepEqual(filterAvailableBottles([inventory[1]], 'laranja').map((item) => item.id), ['laranja']);
});

test('all returns agencies with at least one available bottle', () => {
  assert.equal(filterAvailableBottles([{ ...inventory[0] }], 'todas').length, 1);
  assert.equal(filterAvailableBottles([{ ...inventory[1] }], 'todas').length, 1);
  assert.equal(filterAvailableBottles(inventory, 'todas').length, 2);
  assert.equal(filterAvailableBottles(inventory.map((item) => ({ ...item, available: 0 })), 'todas').length, 0);
});

test('an agency stops matching after the requested bottle becomes unavailable', () => {
  const available = { bottleName: 'Botija Laranja', available: 1 };
  assert.equal(filterAvailableBottles([available], 'laranja').length, 1);
  available.available = 0;
  assert.equal(filterAvailableBottles([available], 'laranja').length, 0);
});

test('availability filtering composes with distance data', () => {
  const nearby = { id: 'nearby', bottleName: 'Botija Azul', available: 0, distance: 1 };
  const farther = { id: 'farther', bottleName: 'Botija Azul', available: 1, distance: 4 };
  const matches = filterAvailableBottles([nearby, farther], 'azul');
  assert.deepEqual(matches.map((item) => item.id), ['farther']);
  assert.ok(matches[0].distance <= 5);
});

test('findLoginUser accepts agency credentials from the agency table', async () => {
  const hashed = await bcrypt.hash('agencia123', 10);
  const agency = { id: 7, email: 'agency@test.com', password: hashed, role: 'agency', name: 'Agência Teste', status: 'APPROVED' };

  const selected = await findLoginUser(agency.email, 'agencia123', [agency], []);
  assert.equal(selected.role, 'agency');
  assert.equal(selected.name, 'Agência Teste');
});

test('login blocks pending agency with the expected message', async () => {
  const hashed = await bcrypt.hash('pending123', 10);
  const agency = { id: 8, email: 'pending@test.com', password: hashed, role: 'agency', name: 'Agência Pendente', status: 'PENDING' };

  const req = { body: { email: agency.email, password: 'pending123' } };
  const res = {
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.payload = payload; return this; }
  };

  await login(req, res, [agency], []);
  assert.equal(res.statusCode, 403);
  assert.match(res.payload.message, /aguardando aprovação/i);
});

test('login blocks suspended agency with the expected message', async () => {
  const hashed = await bcrypt.hash('suspended123', 10);
  const agency = { id: 9, email: 'suspended@test.com', password: hashed, role: 'agency', name: 'Agência Suspensa', status: 'SUSPENDED' };

  const req = { body: { email: agency.email, password: 'suspended123' } };
  const res = {
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.payload = payload; return this; }
  };

  await login(req, res, [agency], []);
  assert.equal(res.statusCode, 403);
  assert.match(res.payload.message, /temporariamente suspensa/i);
});
