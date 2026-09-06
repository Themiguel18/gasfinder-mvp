const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role || 'client', name: user.name },
    process.env.JWT_SECRET || 'dev_secret',
    { expiresIn: '7d' }
  );
}

async function findLoginUser(email, password, userRows = db.users, agencyRows = db.agencies) {
  const user = userRows.find((item) => item.email === email) || null;
  if (user) {
    const valid = await bcrypt.compare(password, user.password);
    if (valid) return { ...user, role: user.role || 'client' };
  }

  const agency = agencyRows.find((item) => item.email === email) || null;
  if (agency) {
    const valid = await bcrypt.compare(password, agency.password);
    if (valid) return { ...agency, role: 'agency', name: agency.name || agency.responsible || 'Agência' };
  }

  return null;
}

async function register(req, res) {
  const { name, email, password, role = 'client' } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Nome, email e senha são obrigatórios.' });
  }

  const userExists = db.users.some((user) => user.email === email) || db.agencies.some((agency) => agency.email === email);
  if (userExists) {
    return res.status(400).json({ message: 'Este email já está em uso.' });
  }

  const hashed = await bcrypt.hash(password, 10);
  const newUser = { id: Date.now(), name, email, password: hashed, role };
  db.users.push(newUser);

  const token = signToken(newUser);
  return res.status(201).json({ token, user: { id: newUser.id, name, email, role } });
}

async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email e senha são obrigatórios.' });
  }

  const matched = await findLoginUser(email, password, db.users, db.agencies);
  if (!matched) {
    return res.status(401).json({ message: 'Credenciais inválidas.' });
  }

  const token = signToken(matched);
  return res.json({
    token,
    user: { id: matched.id, name: matched.name, email: matched.email, role: matched.role }
  });
}

module.exports = { register, login, findLoginUser };
