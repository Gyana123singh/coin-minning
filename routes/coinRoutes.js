const express = require("express");
const router = express.Router();
const {
  getCoinPackages,
  getCoinRate,
  purchaseCoins,
  submitPaymentProof,
  cancelPurchase,
  getPurchaseHistory,
  transferCoins,
  getCoinBalance,
  getPaymentInfo,
  submitUpiTransaction,
  getMyWallet,
  getMyTransactions,
} = require("../controllers/coinController");
const { protect } = require("../middleware/auth");
const { upload } = require("../middleware/upload");

// Public routes
router.get("/packages", getCoinPackages);
router.get("/rate", getCoinRate);

// Protected routes
router.use(protect);

router.get("/balance", getCoinBalance);
router.get("/payment-info", getPaymentInfo);
router.post("/purchase", purchaseCoins);
router.post(
  "/purchase/:transactionId/proof",
  upload.single("paymentProof"),
  submitPaymentProof,
);
router.post("/purchase/:transactionId/cancel", cancelPurchase);
router.get("/purchases", getPurchaseHistory);
router.post("/transfer", transferCoins);
router.post("/submit-transaction", submitUpiTransaction);
router.get("/me/wallet", getMyWallet);
router.get("/me/transactions", getMyTransactions);

module.exports = router;
