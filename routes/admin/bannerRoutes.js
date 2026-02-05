const express = require('express');
const router = express.Router();
const { protectAdmin, checkPermission } = require('../../middleware/adminAuth');
const { upload } = require('../../middleware/upload');
const {
  getAllBanners,
  getActiveBanners,
  getBannerById,
  createBanner,
  updateBanner,
  deleteBanner,
  toggleBannerStatus,
  reorderBanners,
  recordBannerView,
  recordBannerClick,
  getBannerStats,
} = require('../../controllers/admin/adminBannerController');

router.use(protectAdmin);

router.get('/stats', getBannerStats);
router.get('/active', getActiveBanners);

router.route('/')
  .get(getAllBanners)
  .post(checkPermission('manage_banners'), upload.single('image'), createBanner);

router.put('/reorder', checkPermission('manage_banners'), reorderBanners);

router.route('/:id')
  .get(getBannerById)
  .put(checkPermission('manage_banners'), upload.single('image'), updateBanner)
  .delete(checkPermission('manage_banners'), deleteBanner);

router.put('/:id/toggle', checkPermission('manage_banners'), toggleBannerStatus);
router.post('/:id/view', recordBannerView);
router.post('/:id/click', recordBannerClick);

module.exports = router;
