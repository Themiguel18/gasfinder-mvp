const test = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');

const { calculateDistanceKm, buildSearchRadiusPlan } = require('../backend/services/searchService');
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
