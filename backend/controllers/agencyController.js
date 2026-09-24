const db = require('../config/database');
const bcrypt = require('bcryptjs');
const { calculateDistanceKm, filterAvailableBottles, normalizeBottleType } = require('../services/searchService');
const { saveDatabase } = db;

function normalizeAgencyStatus(value) {
  const normalized = String(value || 'PENDING').toUpperCase();
  if (normalized === 'ACTIVE') return 'APPROVED';
  if (['APPROVED', 'PENDING', 'REJECTED', 'SUSPENDED'].includes(normalized)) {
    return normalized;
  }
  return 'PENDING';
}

function publicAgency(agency) {
  const { password, ...safeAgency } = agency;
  return { ...safeAgency, status: normalizeAgencyStatus(safeAgency.status) };
}

function getNearbyAgencies(req, res) {
  const { latitude, longitude } = req.query;
  const bottleType = normalizeBottleType(req.query.tipo_botija || req.query.bottleName);
  const radius = Math.min(Math.max(Number(req.query.radius) || 5, 1), 50);
  const lat = Number(latitude);
  const lon = Number(longitude);

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return res.status(400).json({ message: 'Localização do cliente é obrigatória.' });
  }

  const matches = db.agencies.filter((agency) => normalizeAgencyStatus(agency.status) === 'APPROVED' && agency.verified === 1);
  const results = matches.flatMap((agency) => {
    const distance = Number(calculateDistanceKm(lat, lon, agency.latitude, agency.longitude).toFixed(2));
    if (distance > radius) return [];
    const bottleResults = db.availability
      .filter((entry) => entry.agency_id === agency.id)
      .map((entry) => {
        const bottle = db.bottles.find((item) => item.id === entry.bottle_id);
        return {
          ...publicAgency(agency),
          bottleName: bottle ? bottle.name : null,
          bottleColor: bottle ? bottle.color : null,
          available: Boolean(entry.available),
          price: entry.price,
          updatedAt: entry.updated_at,
          distance
        };
      });

    return filterAvailableBottles(bottleResults, bottleType);
  }).sort((a, b) => a.distance - b.distance || new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0) || Number(a.price || Infinity) - Number(b.price || Infinity));

  return res.json({ radius, message: results.length ? 'Resultados encontrados na área atual.' : `Nenhuma agência com ${bottleType} disponível em ${radius} km.`, results });
}

function getAgencyById(req, res) {
  const agency = db.agencies.find((item) => item.id === Number(req.params.id));
  if (!agency) {
    return res.status(404).json({ message: 'Agência não encontrada.' });
  }

  const agencyWithDetails = {
    ...publicAgency(agency),
    schedules: db.schedules.filter((item) => item.agency_id === agency.id),
    availability: db.availability
      .filter((item) => item.agency_id === agency.id)
      .map((item) => ({ ...item, bottle_name: db.bottles.find((b) => b.id === item.bottle_id)?.name || null, bottle_color: db.bottles.find((b) => b.id === item.bottle_id)?.color || null }))
  };

  return res.json(agencyWithDetails);
}

function createAgency(req, res) {
  const { name, responsible, phone, email, password, address, latitude, longitude, hours, bottles: bottleList } = req.body;

  if (!name || !responsible || !phone || !email || !password || !address || !Number.isFinite(Number(latitude)) || !Number.isFinite(Number(longitude))) {
    return res.status(400).json({ message: 'Preencha todos os campos obrigatórios.' });
  }

  const exists = db.agencies.some((agency) => String(agency.email || '').trim().toLowerCase() === String(email).trim().toLowerCase());
  if (exists) {
    return res.status(400).json({ message: 'Essa agência já está cadastrada.' });
  }

  const hashed = bcrypt.hashSync(password, 10);
  const agencyId = Date.now();
  const newAgency = {
    id: agencyId,
    name,
    responsible,
    phone,
    email,
    password: hashed,
    address,
    latitude: Number(latitude),
    longitude: Number(longitude),
    hours: hours || '',
    status: 'PENDING',
    verified: 0,
    created_at: new Date().toISOString()
  };

  db.agencies.push(newAgency);
  db.agency_requests.push({ id: agencyId, agency_id: agencyId, status: 'PENDING', created_at: newAgency.created_at });

  if (Array.isArray(hours)) {
    hours.forEach((schedule) => {
      db.schedules.push({ id: Date.now() + Math.random(), agency_id: agencyId, ...schedule });
    });
  }

  if (Array.isArray(bottleList)) {
    bottleList.forEach((bottle) => {
      db.availability.push({ id: Date.now() + Math.random(), agency_id: agencyId, bottle_id: Number(bottle.bottle_id), available: bottle.available ? 1 : 0, price: bottle.price || 0, updated_at: new Date().toISOString() });
    });
  }

  saveDatabase();

  return res.status(201).json({ message: 'Cadastro realizado com sucesso. Sua agência está aguardando aprovação do administrador.', agencyId });
}

function listBottleTypes(req, res) {
  return res.json(db.bottles.filter((item) => item.status === 'active'));
}

function updateAvailability(req, res) {
  const { id } = req.params;

  const agency = db.agencies.find((item) => item.id === Number(id));
  if (!agency) return res.status(404).json({ message: 'Agência não encontrada.' });

  const updates = Array.isArray(req.body.items) ? req.body.items : [req.body];
  if (!updates.length || updates.some((item) => item.available === undefined)) {
    return res.status(400).json({ message: 'Disponibilidade obrigatória.' });
  }

  for (const item of updates) {
    const bottleId = Number(item.bottleId);
    const price = Number(item.price);
    if (![1, 2].includes(bottleId) || !Number.isFinite(price) || price < 0) {
      return res.status(400).json({ message: 'Tipo de botija ou preço inválido.' });
    }

    let record = db.availability.find((entry) => entry.agency_id === agency.id && entry.bottle_id === bottleId);
    if (!record) {
      record = { id: Date.now() + bottleId, agency_id: agency.id, bottle_id: bottleId, available: 0, price: 0 };
      db.availability.push(record);
    }
    record.available = Boolean(item.available) ? 1 : 0;
    record.price = price;
    record.updated_at = new Date().toISOString();
  }
  saveDatabase();

  return res.json({ message: 'Disponibilidade atualizada com sucesso.', updated: true });
}

function updateAgencyProfile(req, res) {
  const agency = db.agencies.find((item) => item.id === Number(req.params.id));
  if (!agency) return res.status(404).json({ message: 'Agência não encontrada.' });
  const { phone, address, latitude, longitude, hours } = req.body;
  if (phone !== undefined) agency.phone = phone;
  if (address !== undefined) agency.address = address;
  if (latitude !== undefined) agency.latitude = Number(latitude);
  if (longitude !== undefined) agency.longitude = Number(longitude);
  if (hours !== undefined) agency.hours = hours;
  agency.updated_at = new Date().toISOString();
  saveDatabase();
  return res.json({ message: 'Informações atualizadas.', agency: publicAgency(agency) });
}

function getAgencyDashboard(req, res) {
  const agency = db.agencies.find((item) => item.id === Number(req.params.id));
  if (!agency) return res.status(404).json({ message: 'Agência não encontrada.' });
  return res.json({ ...publicAgency(agency), availability: db.availability.filter((item) => item.agency_id === agency.id), schedules: db.schedules.filter((item) => item.agency_id === agency.id) });
}

module.exports = {
  getNearbyAgencies,
  getAgencyById,
  createAgency,
  listBottleTypes,
  updateAvailability,
  updateAgencyProfile,
  getAgencyDashboard
};
