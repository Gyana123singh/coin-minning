const express = require('express');
const router = express.Router();
const {
  getReferrals,
  getShareLink,
  pingInactiveReferrals,
  getReferralEarnings,
  validateReferralCode,
} = require('../controllers/referralController');
const { protect } = require('../middleware/auth');

// Public route
router.get('/validate/:code', validateReferralCode);

// Protected routes
router.use(protect);

router.get('/', getReferrals);
router.get('/share', getShareLink);
router.post('/ping', pingInactiveReferrals);
router.get('/earnings', getReferralEarnings);

module.exports = router;
