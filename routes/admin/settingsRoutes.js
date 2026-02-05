const express = require('express');
const router = express.Router();
const { protectAdmin, checkPermission } = require('../../middleware/adminAuth');
const {
  getAllSettings,
  updateAppSettings,
  updateSocialLinks,
  getSocialLinks,
  updateWithdrawalSettings,
  updateKYCSettings,
  updateTransferSettings,
  updateCheckinSettings,
  toggleMaintenance,
  bulkUpdateSettings,
} = require('../../controllers/admin/adminSettingsController');
const {
  getPromoCodes,
  getPromoCodeStats,
  getPromoCode,
  createPromoCode,
  updatePromoCode,
  deletePromoCode,
  togglePromoCodeStatus,
  bulkDeletePromoCodes
} = require('../../controllers/admin/adminPromoCodeController');

router.use(protectAdmin);

router.get('/', getAllSettings);
router.put('/bulk', checkPermission('manage_settings'), bulkUpdateSettings);

router.get('/social', getSocialLinks);
router.put('/social', checkPermission('manage_settings'), updateSocialLinks);

router.put('/app', checkPermission('manage_settings'), updateAppSettings);
router.put('/withdrawal', checkPermission('manage_settings'), updateWithdrawalSettings);
router.put('/kyc', checkPermission('manage_settings'), updateKYCSettings);
router.put('/transfer', checkPermission('manage_settings'), updateTransferSettings);
router.put('/checkin', checkPermission('manage_settings'), updateCheckinSettings);
router.put('/maintenance', checkPermission('manage_settings'), toggleMaintenance);

// Promo Code Routes
router.get('/promo-codes', getPromoCodes);
router.get('/promo-codes/stats', getPromoCodeStats);
router.get('/promo-codes/:id', getPromoCode);
router.post('/promo-codes', checkPermission('manage_settings'), createPromoCode);
router.put('/promo-codes/:id', checkPermission('manage_settings'), updatePromoCode);
router.put('/promo-codes/:id/toggle-status', checkPermission('manage_settings'), togglePromoCodeStatus);
router.delete('/promo-codes/bulk', checkPermission('manage_settings'), bulkDeletePromoCodes);
router.delete('/promo-codes/:id', checkPermission('manage_settings'), deletePromoCode);

module.exports = router;
