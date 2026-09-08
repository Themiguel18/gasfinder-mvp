const express = require('express');
const { getNearbyAgencies, getAgencyById, createAgency, listBottleTypes, updateAvailability } = require('../controllers/agencyController');
const { authenticateToken, requireRole, requireAgencyOwner } = require('../middleware/auth');

const router = express.Router();

router.get('/proximas', getNearbyAgencies);
router.get('/bottles', listBottleTypes);
router.get('/:id', getAgencyById);
router.post('/', createAgency);
router.get('/:id/dashboard', authenticateToken, requireRole('agency', 'admin'), requireAgencyOwner, getAgencyDashboard);
router.put('/:id/profile', authenticateToken, requireRole('agency', 'admin'), requireAgencyOwner, updateAgencyProfile);
router.put('/:id/availability', authenticateToken, requireRole('agency', 'admin'), requireAgencyOwner, updateAvailability);

module.exports = router;
