const express = require('express');
const { getAllAgencies, approveAgency, suspendAgency, getDashboardStats } = require('../controllers/adminController');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken, requireRole('admin'));
router.get('/agencias', getAllAgencies);
router.get('/stats', getDashboardStats);
router.put('/agencias/:id/aprovar', approveAgency);
router.put('/agencias/:id/suspender', suspendAgency);

module.exports = router;
