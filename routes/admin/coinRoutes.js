const express = require('express');
const router = express.Router();
const { protectAdmin, checkPermission } = require('../../middleware/adminAuth');
const {
  getAllPackages,
  getPackageById,
  createPackage,
  updatePackage,
  deletePackage,
  togglePackageStatus,
  reorderPackages,
  getCoinStats,
} = require('../../controllers/admin/adminCoinController');

router.use(protectAdmin);

// Stats route
router.get('/stats', getCoinStats);

router.route('/')
  .get(getAllPackages)
  .post(checkPermission('manage_coins'), createPackage);

router.put('/reorder', checkPermission('manage_coins'), reorderPackages);

router.route('/:id')
  .get(getPackageById)
  .put(checkPermission('manage_coins'), updatePackage)
  .delete(checkPermission('manage_coins'), deletePackage);

router.put('/:id/toggle', checkPermission('manage_coins'), togglePackageStatus);

module.exports = router;
