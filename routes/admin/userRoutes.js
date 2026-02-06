const express = require("express");
const router = express.Router();
const { protectAdmin, checkPermission } = require("../../middleware/adminAuth");
const {
  getAllUsers,
  getUserById,
  updateUser,
  banUser,
  unbanUser,
  deleteUser,
  addCoins,
  deductCoins,
  getUserStats,
  exportUsers,
  createUser,
} = require("../../controllers/admin/adminUserController");

router.use(protectAdmin);

router.get("/stats", getUserStats);
router.get("/export", exportUsers);

router
  .route("/")
  .get(getAllUsers)
  .post(checkPermission("manage_users"), createUser);

router
  .route("/:id")
  .get(getUserById)
  .put(checkPermission("manage_users"), updateUser)
  .delete(checkPermission("manage_users"), deleteUser);

router.put("/:id/ban", checkPermission("manage_users"), banUser);
router.put("/:id/unban", checkPermission("manage_users"), unbanUser);
router.post("/:id/add-coins", checkPermission("manage_users"), addCoins);
router.post("/:id/deduct-coins", checkPermission("manage_users"), deductCoins);

module.exports = router;
