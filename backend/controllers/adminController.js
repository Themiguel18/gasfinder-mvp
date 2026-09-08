const db = require('../config/database');
const { saveDatabase } = db;

function getAllAgencies(req, res) {
  return res.json(db.agencies.map((agency) => ({
    ...(({ password, ...safeAgency }) => safeAgency)(agency),
    availability: db.availability.filter((item) => item.agency_id === agency.id).map((item) => ({ ...item, bottle_name: db.bottles.find((bottle) => bottle.id === item.bottle_id)?.name }))
  })));
}

function approveAgency(req, res) {
  const agency = db.agencies.find((item) => item.id === Number(req.params.id));
  if (!agency) {
    return res.status(404).json({ message: 'Agência não encontrada.' });
  }

  agency.status = 'active';
  agency.verified = 1;
  const request = db.agency_requests.find((item) => item.agency_id === agency.id);
  if (request) request.status = 'approved';
  saveDatabase();
  return res.json({ message: 'Agência aprovada.', updated: true });
}

function suspendAgency(req, res) {
  const agency = db.agencies.find((item) => item.id === Number(req.params.id));
  if (!agency) {
    return res.status(404).json({ message: 'Agência não encontrada.' });
  }

  agency.status = 'suspended';
  agency.verified = 0;
  saveDatabase();
  return res.json({ message: 'Agência suspensa.', updated: true });
}

function getDashboardStats(req, res) {
  const stats = {
    total_agencies: db.agencies.length,
    active_agencies: db.agencies.filter((agency) => agency.status === 'active').length,
    pending_agencies: db.agencies.filter((agency) => agency.status === 'pending').length,
    suspended_agencies: db.agencies.filter((agency) => agency.status === 'suspended').length,
    total_clients: db.users.filter((user) => user.role === 'client').length,
    total_searches: db.searches.length
    ,gas_available_agencies: db.agencies.filter((agency) => agency.status === 'active' && db.availability.some((item) => item.agency_id === agency.id && item.available === 1)).length
  };

  return res.json(stats);
}

function rejectAgency(req, res) {
  const agency = db.agencies.find((item) => item.id === Number(req.params.id));
  if (!agency) return res.status(404).json({ message: 'Agência não encontrada.' });
  agency.status = 'rejected';
  agency.verified = 0;
  const request = db.agency_requests.find((item) => item.agency_id === agency.id);
  if (request) request.status = 'rejected';
  saveDatabase();
  return res.json({ message: 'Solicitação rejeitada.', updated: true });
}

function deleteAgency(req, res) {
  const id = Number(req.params.id);
  const index = db.agencies.findIndex((item) => item.id === id);
  if (index === -1) return res.status(404).json({ message: 'Agência não encontrada.' });
  db.agencies.splice(index, 1);
  db.availability = db.availability.filter((item) => item.agency_id !== id);
  db.schedules = db.schedules.filter((item) => item.agency_id !== id);
  db.agency_requests = db.agency_requests.filter((item) => item.agency_id !== id);
  saveDatabase();
  return res.json({ message: 'Agência excluída.', updated: true });
}

function updateAgency(req, res) {
  const agency = db.agencies.find((item) => item.id === Number(req.params.id));
  if (!agency) return res.status(404).json({ message: 'Agência não encontrada.' });
  const fields = ['name', 'responsible', 'phone', 'address', 'latitude', 'longitude', 'hours', 'status'];
  fields.forEach((field) => { if (req.body[field] !== undefined) agency[field] = req.body[field]; });
  if (req.body.status) agency.verified = req.body.status === 'active' ? 1 : 0;
  saveDatabase();
  const { password, ...safeAgency } = agency;
  return res.json({ message: 'Agência atualizada.', agency: safeAgency });
}

module.exports = { getAllAgencies, approveAgency, suspendAgency, rejectAgency, deleteAgency, updateAgency, getDashboardStats };
