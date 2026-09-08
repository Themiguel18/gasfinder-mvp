const db = require('../config/database');
const bcrypt = require('bcryptjs');
const { calculateDistanceKm } = require('../services/searchService');
const { saveDatabase } = db;

function publicAgency(agency) {
  const { password, ...safeAgency } = agency;
  return safeAgency;
}

function getNearbyAgencies(req, res) {
  const { latitude, longitude, bottleName } = req.query;
  const radius = Math.min(Math.max(Number(req.query.radius) || 5, 1), 50);
  const lat = Number(latitude);
  const lon = Number(longitude);

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return res.status(400).json({ message: 'Localização do cliente é obrigatória.' });
  }

  const matches = db.agencies.filter((agency) => agency.status === 'active' && agency.verified === 1);
  const results = matches.flatMap((agency) => {
    const distance = Number(calculateDistanceKm(lat, lon, agency.latitude, agency.longitude).toFixed(2));
    if (distance > radius) return [];
    return db.availability
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
      })
      .filter((item) => !bottleName || bottleName === 'Todas' || item.bottleName === bottleName);
  }).sort((a, b) => Number(b.available) - Number(a.available) || a.distance - b.distance);

  return res.json({ radius, message: results.length ? 'Resultados encontrados na área atual.' : `Nenhuma agência encontrada em ${radius} km.`, results });
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

  const exists = db.agencies.some((agency) => agency.email === email);
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
    status: 'pending',
    verified: 0,
    created_at: new Date().toISOString()
  };

  db.agencies.push(newAgency);
  db.agency_requests.push({ id: agencyId, agency_id: agencyId, status: 'pending', created_at: newAgency.created_at });

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

  return res.status(201).json({ message: 'Agência registrada com sucesso. Aguardando aprovação.', agencyId });
}

function listBottleTypes(req, res) {
  return res.json(db.bottles.filter((item) => item.status === 'active'));
}

function updateAvailability(req, res) {
  const { id } = req.params;
  const { available, price } = req.body;

  if (available === undefined) {
    return res.status(400).json({ message: 'Disponibilidade obrigatória.' });
  }

  const agency = db.agencies.find((item) => item.id === Number(id));
  if (!agency) return res.status(404).json({ message: 'Agência não encontrada.' });
  const bottleId = Number(req.body.bottleId);
  if (!db.bottles.some((bottle) => bottle.id === bottleId)) {
    return res.status(400).json({ message: 'Tipo de botija inválido.' });
  }

  let record = db.availability.find((item) => item.agency_id === agency.id && item.bottle_id === bottleId);
  if (!record) {
    record = { id: Date.now(), agency_id: agency.id, bottle_id: bottleId, available: 0, price: 0 };
    db.availability.push(record);
  }
  record.available = Boolean(available) ? 1 : 0;
  record.price = price === undefined ? record.price || 0 : Number(price);
  record.updated_at = new Date().toISOString();
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
