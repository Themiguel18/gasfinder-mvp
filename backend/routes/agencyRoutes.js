const express = require('express');
const { getNearbyAgencies, getAgencyById, createAgency, listBottleTypes, updateAvailability } = require('../controllers/agencyController');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/proximas', getNearbyAgencies);
router.get('/bottles', listBottleTypes);
router.get('/:id', getAgencyById);
router.post('/', createAgency);
router.put('/:id/availability', authenticateToken, requireRole('agency', 'admin'), updateAvailability);

module.exports = router;
