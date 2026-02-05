const express = require('express');
const router = express.Router();
const { protectAdmin, restrictTo } = require('../../middleware/adminAuth');
const {
  login,
  getMe,
  updateProfile,
  changePassword,
  createAdmin,
  getAllAdmins,
  updateAdmin,
  deleteAdmin,
  logout,
} = require('../../controllers/admin/adminAuthController');

// Public routes
router.post('/login', login);

// Protected routes (all admins)
router.use(protectAdmin);

router.get('/me', getMe);
router.put('/profile', updateProfile);
router.put('/change-password', changePassword);
router.post('/logout', logout);

// Super admin only routes
router.use(restrictTo('super_admin'));

router.route('/admins')
  .get(getAllAdmins)
  .post(createAdmin);

router.route('/admins/:id')
  .put(updateAdmin)
  .delete(deleteAdmin);

module.exports = router;
