const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { saveDatabase } = db;

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role || 'client', name: user.name },
    process.env.JWT_SECRET || 'dev_secret',
    { expiresIn: '7d' }
  );
}

function normalizeAgencyStatus(value) {
  const normalized = String(value || 'PENDING').toUpperCase();
  if (normalized === 'ACTIVE') return 'APPROVED';
  if (['APPROVED', 'PENDING', 'REJECTED', 'SUSPENDED'].includes(normalized)) {
    return normalized;
  }
  return 'PENDING';
}

async function findLoginUser(email, password, userRows = db.users, agencyRows = db.agencies) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail || !password) return null;

  const user = userRows.find((item) => String(item.email || '').trim().toLowerCase() === normalizedEmail) || null;
  if (user) {
    const valid = await bcrypt.compare(password, user.password);
    if (valid) return { ...user, role: (user.role || 'client').toLowerCase() };
  }

  const agency = agencyRows.find((item) => String(item.email || '').trim().toLowerCase() === normalizedEmail) || null;
  if (agency) {
    const valid = await bcrypt.compare(password, agency.password);
    if (!valid) return null;

    const status = normalizeAgencyStatus(agency.status);
    return {
      ...agency,
      role: 'agency',
      status,
      name: agency.name || agency.responsible || 'Agência'
    };
  }

  return null;
}

async function register(req, res) {
  const { name, email, password, role = 'client' } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Nome, email e senha são obrigatórios.' });
  }

  const userExists = db.users.some((user) => String(user.email || '').trim().toLowerCase() === String(email).trim().toLowerCase()) || db.agencies.some((agency) => String(agency.email || '').trim().toLowerCase() === String(email).trim().toLowerCase());
  if (userExists) {
    return res.status(400).json({ message: 'Este email já está em uso.' });
  }

  const hashed = await bcrypt.hash(password, 10);
  const newUser = { id: Date.now(), name, email, password: hashed, role: 'client' };
  db.users.push(newUser);
  saveDatabase();

  const token = signToken(newUser);
  return res.status(201).json({ token, user: { id: newUser.id, name, email, role } });
}

async function login(req, res, injectedUserRows = null, injectedAgencyRows = null) {
  const { email, password } = req.body || {};
  const userRows = Array.isArray(injectedUserRows) ? injectedUserRows : db.users;
  const agencyRows = Array.isArray(injectedAgencyRows) ? injectedAgencyRows : db.agencies;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email e senha são obrigatórios.' });
  }

  const matched = await findLoginUser(email, password, userRows, agencyRows);
  if (!matched) {
    return res.status(401).json({ message: 'Email ou palavra-passe incorretos.' });
  }

  if (matched.role === 'agency') {
    const status = normalizeAgencyStatus(matched.status);
    if (status === 'PENDING') {
      return res.status(403).json({ message: 'Sua agência ainda está aguardando aprovação do administrador.' });
    }
    if (status === 'SUSPENDED') {
      return res.status(403).json({ message: 'Esta conta de agência está temporariamente suspensa.' });
    }
    if (status === 'REJECTED') {
      return res.status(403).json({ message: 'Sua agência foi rejeitada e não pode acessar o painel.' });
    }
  }

  const token = signToken(matched);
  return res.json({
    token,
    user: { id: matched.id, name: matched.name, email: matched.email, role: matched.role, status: normalizeAgencyStatus(matched.status) }
  });
}

function me(req, res) {
  const source = req.user.role === 'agency'
    ? db.agencies.find((agency) => agency.id === Number(req.user.id))
    : db.users.find((user) => user.id === Number(req.user.id));
  if (!source) return res.status(404).json({ message: 'Utilizador não encontrado.' });
  return res.json({ id: source.id, name: source.name, email: source.email, role: req.user.role });
}

module.exports = { register, login, me, findLoginUser };
