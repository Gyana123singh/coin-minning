const express = require("express");
const router = express.Router();
const { protectAdmin, checkPermission } = require("../../middleware/adminAuth");
const {
  createCryptoNetwork,
  getCryptoNetworks,
  updateCryptoNetwork,
  deleteCryptoNetwork,
  approveCryptoDeposit,
  rejectCryptoDeposit,
} = require("../../controllers/admin/cryptoNetworkController");

router.use(protectAdmin);

// routes/admin/cryptoNetworks.js
router.post("/crypto-networks", createCryptoNetwork);
router.get("/crypto-networks", getCryptoNetworks);
router.put("/crypto-networks/:id", updateCryptoNetwork);
router.delete("/crypto-networks/:id", deleteCryptoNetwork);

// routes/admin/transactions.js
router.put("/crypto/:id/approve", approveCryptoDeposit);
router.put("/crypto/:id/reject", rejectCryptoDeposit);
module.exports = router;
