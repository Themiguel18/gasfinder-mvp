const test = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');

const { calculateDistanceKm, buildSearchRadiusPlan } = require('../backend/services/searchService');
const { findLoginUser } = require('../backend/controllers/authController');

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
  const agency = { id: 7, email: 'agency@test.com', password: hashed, role: 'agency', name: 'Agência Teste' };

  const selected = await findLoginUser(agency.email, 'agencia123', [agency], []);
  assert.equal(selected.role, 'agency');
  assert.equal(selected.name, 'Agência Teste');
});
