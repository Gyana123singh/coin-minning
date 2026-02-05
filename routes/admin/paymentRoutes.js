const express = require('express');
const router = express.Router();
const { protectAdmin, checkPermission } = require('../../middleware/adminAuth');
const { upload } = require('../../middleware/upload');
const {
  getAllPaymentProofs,
  getPaymentStats,
  getPaymentProofById,
  approvePaymentProof,
  rejectPaymentProof,
  getPaymentSettings,
  updatePaymentSettings,
  uploadQRCode,
} = require('../../controllers/admin/adminTransactionController');

router.use(protectAdmin);

router.get('/', getAllPaymentProofs);
router.get('/stats', getPaymentStats);

router.route('/settings')
  .get(getPaymentSettings)
  .put(checkPermission('manage_settings'), updatePaymentSettings);

router.post('/upload-qr', checkPermission('manage_settings'), upload.single('qrCode'), uploadQRCode);

router.route('/:id')
  .get(getPaymentProofById);

router.put('/:id/approve', checkPermission('manage_transactions'), approvePaymentProof);
router.put('/:id/reject', checkPermission('manage_transactions'), rejectPaymentProof);

module.exports = router;
