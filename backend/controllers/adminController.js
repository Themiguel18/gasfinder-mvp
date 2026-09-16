const db = require('../config/database');
const { saveDatabase } = db;

function normalizeAgencyStatus(value) {
  const normalized = String(value || 'PENDING').toUpperCase();
  if (normalized === 'ACTIVE') return 'APPROVED';
  if (['APPROVED', 'PENDING', 'REJECTED', 'SUSPENDED'].includes(normalized)) {
    return normalized;
  }
  return 'PENDING';
}

function getAllAgencies(req, res) {
  return res.json(db.agencies.map((agency) => ({
    ...(({ password, ...safeAgency }) => safeAgency)(agency),
    status: normalizeAgencyStatus(agency.status),
    availability: db.availability.filter((item) => item.agency_id === agency.id).map((item) => ({ ...item, bottle_name: db.bottles.find((bottle) => bottle.id === item.bottle_id)?.name }))
  })));
}

function approveAgency(req, res) {
  const agency = db.agencies.find((item) => item.id === Number(req.params.id));
  if (!agency) {
    return res.status(404).json({ message: 'Agência não encontrada.' });
  }

  agency.status = 'APPROVED';
  agency.verified = 1;
  const request = db.agency_requests.find((item) => item.agency_id === agency.id);
  if (request) request.status = 'APPROVED';
  saveDatabase();
  return res.json({ message: 'Agência aprovada.', updated: true });
}

function suspendAgency(req, res) {
  const agency = db.agencies.find((item) => item.id === Number(req.params.id));
  if (!agency) {
    return res.status(404).json({ message: 'Agência não encontrada.' });
  }

  agency.status = 'SUSPENDED';
  agency.verified = 0;
  saveDatabase();
  return res.json({ message: 'Agência suspensa.', updated: true });
}

function getDashboardStats(req, res) {
  const stats = {
    total_agencies: db.agencies.length,
    active_agencies: db.agencies.filter((agency) => normalizeAgencyStatus(agency.status) === 'APPROVED').length,
    pending_agencies: db.agencies.filter((agency) => normalizeAgencyStatus(agency.status) === 'PENDING').length,
    suspended_agencies: db.agencies.filter((agency) => normalizeAgencyStatus(agency.status) === 'SUSPENDED').length,
    total_clients: db.users.filter((user) => user.role === 'client').length,
    total_searches: db.searches.length,
    gas_available_agencies: db.agencies.filter((agency) => normalizeAgencyStatus(agency.status) === 'APPROVED' && db.availability.some((item) => item.agency_id === agency.id && item.available === 1)).length
  };

  return res.json(stats);
}

function rejectAgency(req, res) {
  const agency = db.agencies.find((item) => item.id === Number(req.params.id));
  if (!agency) return res.status(404).json({ message: 'Agência não encontrada.' });
  agency.status = 'REJECTED';
  agency.verified = 0;
  const request = db.agency_requests.find((item) => item.agency_id === agency.id);
  if (request) request.status = 'REJECTED';
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
  const fields = ['name', 'responsible', 'phone', 'address', 'latitude', 'longitude', 'hours'];
  fields.forEach((field) => { if (req.body[field] !== undefined) agency[field] = req.body[field]; });
  if (req.body.status !== undefined) agency.status = normalizeAgencyStatus(req.body.status);
  agency.verified = agency.status === 'APPROVED' ? 1 : 0;
  saveDatabase();
  const { password, ...safeAgency } = agency;
  return res.json({ message: 'Agência atualizada.', agency: { ...safeAgency, status: normalizeAgencyStatus(safeAgency.status) } });
}

module.exports = { getAllAgencies, approveAgency, suspendAgency, rejectAgency, deleteAgency, updateAgency, getDashboardStats };
