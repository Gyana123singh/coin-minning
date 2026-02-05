const express = require('express');
const router = express.Router();
const { protectAdmin, checkPermission } = require('../../middleware/adminAuth');
const {
  getAllKYC,
  getKYCStats,
  getKYCById,
  approveKYC,
  rejectKYC,
  exportKYC,
} = require('../../controllers/admin/adminKYCController');

router.use(protectAdmin);

router.get('/stats', getKYCStats);
router.get('/export', exportKYC);

router.route('/')
  .get(getAllKYC);

router.route('/:id')
  .get(getKYCById);

router.put('/:id/approve', checkPermission('manage_kyc'), approveKYC);
router.put('/:id/reject', checkPermission('manage_kyc'), rejectKYC);

module.exports = router;
