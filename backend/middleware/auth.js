const jwt = require('jsonwebtoken');

function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Token de autenticação obrigatório.' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret');
    req.user = payload;
    return next();
  } catch (error) {
    return res.status(403).json({ message: 'Token inválido ou expirado.' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Acesso negado.' });
    }
    return next();
  };
}

module.exports = { authenticateToken, requireRole };
