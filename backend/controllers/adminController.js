const db = require('../config/database');

function getAllAgencies(req, res) {
  return res.json(db.agencies);
}

function approveAgency(req, res) {
  const agency = db.agencies.find((item) => item.id === Number(req.params.id));
  if (!agency) {
    return res.status(404).json({ message: 'Agência não encontrada.' });
  }

  agency.status = 'active';
  agency.verified = 1;
  return res.json({ message: 'Agência aprovada.', updated: true });
}

function suspendAgency(req, res) {
  const agency = db.agencies.find((item) => item.id === Number(req.params.id));
  if (!agency) {
    return res.status(404).json({ message: 'Agência não encontrada.' });
  }

  agency.status = 'suspended';
  agency.verified = 0;
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
  };

  return res.json(stats);
}

module.exports = { getAllAgencies, approveAgency, suspendAgency, getDashboardStats };
