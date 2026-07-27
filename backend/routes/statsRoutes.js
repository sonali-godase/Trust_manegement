const express = require('express');
const router = express.Router();
const statsController = require('../controllers/statsController');
const donationController = require('../controllers/donationController');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/public', statsController.getPublicStats);
router.get('/', authMiddleware, donationController.getDashboardStats);

module.exports = router;
