require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { insertSeedData } = require('./backend/models/seed');
const authRoutes = require('./backend/routes/authRoutes');
const agencyRoutes = require('./backend/routes/agencyRoutes');
const adminRoutes = require('./backend/routes/adminRoutes');

const app = express();
const port = process.env.PORT || 3000;

insertSeedData();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/agencias', agencyRoutes);
app.use('/api/admin', adminRoutes);

app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/health', (req, res) => {
  res.json({ ok: true, message: 'GasFinder API ativa' });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
  console.log(`GasFinder API running on http://localhost:${port}`);
});
