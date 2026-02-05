const express = require('express');
const router = express.Router();
const { protectAdmin } = require('../../middleware/adminAuth');
const {
  getDashboardStats,
  getSystemHealth,
} = require('../../controllers/admin/adminDashboardController');

router.use(protectAdmin);

router.get('/stats', getDashboardStats);
router.get('/health', getSystemHealth);

module.exports = router;
