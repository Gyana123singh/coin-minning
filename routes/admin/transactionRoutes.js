const express = require("express");
const router = express.Router();
const { protectAdmin, checkPermission } = require("../../middleware/adminAuth");
const {
  getAllTransactions,
  getPendingWithdrawals,
  approveWithdrawal,
  rejectWithdrawal,
  getTransactionStats,
  createCryptoNetwork,
  updateCryptoNetwork,
  getAllCryptoNetworks,
  approveCryptoDeposit,
  rejectCryptoDeposit,
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

// POST /api/admin/crypto-networks
router.post("/crypto-networks", createCryptoNetwork);

// PUT /api/admin/crypto-networks/:id
router.put("/crypto-networks/:id", updateCryptoNetwork);

// GET /api/admin/crypto-networks
router.get("/crypto-networks", getAllCryptoNetworks);

// ==================== CRYPTO DEPOSIT APPROVAL ====================

// PUT /api/admin/transactions/:id/approve-crypto
router.put("/transactions/:id/approve-crypto", approveCryptoDeposit);
router.put("/transactions/:id/reject-crypto", rejectCryptoDeposit);

module.exports = router;
