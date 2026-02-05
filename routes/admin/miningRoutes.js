const express = require('express');
const router = express.Router();
const { protectAdmin, checkPermission } = require('../../middleware/adminAuth');
const {
  getAllMiningSessions,
  getMiningStats,
  getMiningSettings,
  updateMiningSettings,
  getActiveMiners,
  getLeaderboard,
  cancelMiningSession,
} = require('../../controllers/admin/adminMiningController');

router.use(protectAdmin);

router.get('/sessions', getAllMiningSessions);
router.get('/stats', getMiningStats);
router.get('/active', getActiveMiners);
router.get('/leaderboard', getLeaderboard);

router.route('/settings')
  .get(getMiningSettings)
  .put(checkPermission('manage_settings'), updateMiningSettings);

router.put('/sessions/:id/cancel', checkPermission('manage_mining'), cancelMiningSession);

module.exports = router;
