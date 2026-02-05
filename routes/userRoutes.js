const express = require('express');
const router = express.Router();
const {
  getProfile,
  updateProfile,
  uploadAvatar,
  changePassword,
  getActivity,
  getStats,
  deleteAccount,
  dailyCheckin,
  getCheckinStatus,
  getDashboard,
  redeemPromoCode,
} = require('../controllers/userController');
const { protect } = require('../middleware/auth');
const { uploadAvatar: avatarUpload } = require('../middleware/upload');

// All routes are protected
router.use(protect);

router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.post('/avatar', avatarUpload.single('avatar'), uploadAvatar);
router.put('/password', changePassword);
router.get('/activity', getActivity);
router.get('/stats', getStats);
router.get('/dashboard', getDashboard);
router.get('/daily-checkin', getCheckinStatus);
router.post('/daily-checkin', dailyCheckin);
router.post('/redeem-code', redeemPromoCode);
router.delete('/account', deleteAccount);

module.exports = router;
