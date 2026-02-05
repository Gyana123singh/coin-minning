const express = require('express');
const router = express.Router();
const {
  startMining,
  getMiningStatus,
  claimRewards,
  getMiningHistory,
  cancelMining,
  getLeaderboard,
  boostMining,
  getRewardsBreakdown,
} = require('../controllers/miningController');
const { protect } = require('../middleware/auth');

// All routes are protected
router.use(protect);

router.post('/start', startMining);
router.get('/status', getMiningStatus);
router.post('/claim', claimRewards);
router.get('/history', getMiningHistory);
router.post('/cancel', cancelMining);
router.get('/leaderboard', getLeaderboard);
router.post('/boost', boostMining);
router.get('/rewards', getRewardsBreakdown);

module.exports = router;
