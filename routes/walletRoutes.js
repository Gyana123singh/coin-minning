const express = require('express');
const router = express.Router();
const {
  getWallet,
  getMiningWallet,
  getPurchaseWallet,
  syncWallet,
  updateWithdrawalAddress,
  requestWithdrawal,
  getTransactions,
  getTransaction,
  getWalletSummary,
  internalTransfer,
} = require('../controllers/walletController');
const { protect } = require('../middleware/auth');

// All routes are protected
router.use(protect);

// Main wallet routes
router.get('/', getWallet);
router.get('/mining', getMiningWallet);      // Get mining wallet only
router.get('/purchase', getPurchaseWallet);  // Get purchase wallet only
router.get('/summary', getWalletSummary);

// Wallet operations
router.post('/sync', syncWallet);
router.put('/withdrawal-address', updateWithdrawalAddress);
router.post('/withdraw', requestWithdrawal);
router.post('/internal-transfer', internalTransfer); // Transfer between mining <-> purchase

// Transaction routes
router.get('/transactions', getTransactions);
router.get('/transactions/:id', getTransaction);

module.exports = router;
