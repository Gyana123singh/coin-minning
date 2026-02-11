const express = require("express");
const router = express.Router();
const { protectAdmin, checkPermission } = require("../../middleware/adminAuth");
const {
  getAllTransactions,
  getPendingWithdrawals,
  approveWithdrawal,
  rejectWithdrawal,
  getTransactionStats,

} = require("../../controllers/admin/adminTransactionController");

router.use(protectAdmin);

router.get("/", getAllTransactions);
router.get("/stats", getTransactionStats);
router.get("/withdrawals/pending", getPendingWithdrawals);

router.put(
  "/withdrawals/:id/approve",
  checkPermission("manage_transactions"),
  approveWithdrawal,
);
router.put(
  "/withdrawals/:id/reject",
  checkPermission("manage_transactions"),
  rejectWithdrawal,
);

// ==================== CRYPTO NETWORK MANAGEMENT ====================


module.exports = router;
