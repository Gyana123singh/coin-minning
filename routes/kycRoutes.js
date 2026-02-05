const express = require('express');
const router = express.Router();
const {
  getKYCStatus,
  submitKYC,
  getKYCDetails,
  resubmitKYC,
} = require('../controllers/kycController');
const { protect } = require('../middleware/auth');
const { uploadKYC } = require('../middleware/upload');

// All routes are protected
router.use(protect);

// KYC upload fields
const kycUploadFields = uploadKYC.fields([
  { name: 'documentFront', maxCount: 1 },
  { name: 'documentBack', maxCount: 1 },
  { name: 'selfie', maxCount: 1 },
]);

router.get('/status', getKYCStatus);
router.post('/submit', kycUploadFields, submitKYC);
router.get('/:id', getKYCDetails);
router.put('/resubmit', kycUploadFields, resubmitKYC);

module.exports = router;
