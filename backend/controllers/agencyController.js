const db = require('../config/database');
const bcrypt = require('bcryptjs');
const { calculateDistanceKm } = require('../services/searchService');

function getNearbyAgencies(req, res) {
  const { latitude, longitude, bottleName } = req.query;
  const lat = Number(latitude);
  const lon = Number(longitude);

  if (!lat || !lon) {
    return res.status(400).json({ message: 'Localização do cliente é obrigatória.' });
  }

  const radiusPlan = [2, 5, 10];
  const allResults = [];

  for (const radius of radiusPlan) {
    const matches = db.agencies.filter((agency) => agency.status === 'active' && agency.verified === 1);
    const filtered = matches
      .map((agency) => {
        const distance = Number(calculateDistanceKm(lat, lon, agency.latitude, agency.longitude).toFixed(2));
        const bottleMatches = db.availability.filter((item) => item.agency_id === agency.id);
        const relevant = bottleMatches.map((entry) => {
          const bottle = db.bottles.find((b) => b.id === entry.bottle_id);
          const matchesBottle = !bottleName || bottleName === 'Todas' || bottle.name === bottleName;
          return {
            ...agency,
            bottleName: bottle ? bottle.name : null,
            bottleColor: bottle ? bottle.color : null,
            available: !!entry.available,
            price: entry.price,
            updatedAt: entry.updated_at,
            distance,
            matchesBottle
          };
        }).filter((item) => item.matchesBottle && distance <= radius);

        return relevant;
      })
      .flat();

    allResults.push(...filtered);
    if (allResults.some((agency) => agency.available)) {
      const final = allResults
        .filter((agency) => (!bottleName || bottleName === 'Todas' || agency.bottleName === bottleName))
        .sort((a, b) => Number(b.available) - Number(a.available) || a.distance - b.distance);
      return res.json({ radius, message: 'Resultados encontrados na área atual.', results: final });
    }
  }

  return res.json({ message: 'Não encontramos gás disponível na área pesquisada.', results: [] });
}

function getAgencyById(req, res) {
  const agency = db.agencies.find((item) => item.id === Number(req.params.id));
  if (!agency) {
    return res.status(404).json({ message: 'Agência não encontrada.' });
  }

  const agencyWithDetails = {
    ...agency,
    schedules: db.schedules.filter((item) => item.agency_id === agency.id),
    availability: db.availability
      .filter((item) => item.agency_id === agency.id)
      .map((item) => ({ ...item, bottle_name: db.bottles.find((b) => b.id === item.bottle_id)?.name || null, bottle_color: db.bottles.find((b) => b.id === item.bottle_id)?.color || null }))
  };

  return res.json(agencyWithDetails);
}

function createAgency(req, res) {
  const { name, responsible, phone, email, password, address, latitude, longitude, hours, bottles: bottleList } = req.body;

  if (!name || !responsible || !phone || !email || !password || !address || !latitude || !longitude) {
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
    status: 'pending',
    verified: 0,
    created_at: new Date().toISOString()
  };

  db.agencies.push(newAgency);

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

  const record = db.availability.find((item) => item.id === Number(id));
  if (!record) {
    return res.status(404).json({ message: 'Registro de disponibilidade não encontrado.' });
  }

  record.available = available ? 1 : 0;
  record.price = price || record.price || 0;
  record.updated_at = new Date().toISOString();

  return res.json({ message: 'Disponibilidade atualizada com sucesso.', updated: true });
}

module.exports = {
  getNearbyAgencies,
  getAgencyById,
  createAgency,
  listBottleTypes,
  updateAvailability
};
