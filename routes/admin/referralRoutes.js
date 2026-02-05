const express = require('express');
const router = express.Router();
const { protectAdmin, checkPermission } = require('../../middleware/adminAuth');
const {
  getAllReferrals,
  getReferralStats,
  getReferralSettings,
  updateReferralSettings,
  getUserReferralTree,
  exportReferrals,
} = require('../../controllers/admin/adminReferralController');

router.use(protectAdmin);

router.get('/', getAllReferrals);
router.get('/stats', getReferralStats);
router.get('/export', exportReferrals);
router.get('/user/:userId/tree', getUserReferralTree);

router.route('/settings')
  .get(getReferralSettings)
  .put(checkPermission('manage_settings'), updateReferralSettings);

module.exports = router;
