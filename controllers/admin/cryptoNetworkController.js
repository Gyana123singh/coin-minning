const CryptoNetwork = require("../../models/CryptoNetwork");
const Transaction = require("../../models/Transaction");
const Wallet = require("../../models/Wallet");
const Notification = require("../../models/Notification");
// Create network (TRC20 / ERC20)
exports.createCryptoNetwork = async (req, res) => {
  try {
    const { name, symbol, network, walletAddress } = req.body;

    if (!name || !network || !walletAddress) {
      return res
        .status(400)
        .json({ success: false, message: "Missing fields" });
    }

    // If QR uploaded, multer + cloudinary gives us req.file.path
    const qrCodeUrl = req.file ? req.file.path : null;

    const created = await CryptoNetwork.create({
      name,
      symbol: symbol || "USDT",
      network,
      walletAddress,
      qrCodeUrl,
    });

    res.json({ success: true, network: created });
  } catch (err) {
    console.error("Create Crypto Network Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get all networks
exports.getCryptoNetworks = async (req, res) => {
  try {
    const networks = await CryptoNetwork.find().sort({ createdAt: -1 });
    res.json({ success: true, networks });
  } catch (err) {
    console.error("Get Crypto Networks Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Update network
exports.updateCryptoNetwork = async (req, res) => {
  try {
    const updated = await CryptoNetwork.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true },
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: "Not found" });
    }

    res.json({ success: true, network: updated });
  } catch (err) {
    console.error("Update Crypto Network Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Delete network
exports.deleteCryptoNetwork = async (req, res) => {
  try {
    await CryptoNetwork.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Deleted" });
  } catch (err) {
    console.error("Delete Crypto Network Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Approve crypto deposit
exports.approveCryptoDeposit = async (req, res) => {
  try {
    const tx = await Transaction.findById(req.params.id);
    if (!tx)
      return res.status(404).json({ success: false, message: "Not found" });

    if (tx.status !== "pending" || tx.paymentMethod !== "crypto") {
      return res
        .status(400)
        .json({ success: false, message: "Invalid transaction" });
    }

    tx.status = "completed";
    tx.processedAt = new Date();
    tx.processedBy = req.admin._id;
    await tx.save();

    let wallet = await Wallet.findOne({ user: tx.user });
    if (!wallet) wallet = await Wallet.create({ user: tx.user });

    // Credit PURCHASE wallet
    await wallet.addPurchaseCoins(tx.coins);

    await Notification.create({
      user: tx.user,
      title: "Crypto Deposit Approved",
      message: `Your crypto deposit of $${tx.amount} has been approved and coins credited.`,
      type: "transaction",
    });

    res.json({ success: true, message: "Deposit approved", transaction: tx });
  } catch (err) {
    console.error("Approve Crypto Deposit Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Reject crypto deposit
exports.rejectCryptoDeposit = async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason) {
      return res
        .status(400)
        .json({ success: false, message: "Reason required" });
    }

    const tx = await Transaction.findById(req.params.id);
    if (!tx)
      return res.status(404).json({ success: false, message: "Not found" });

    if (tx.status !== "pending" || tx.paymentMethod !== "crypto") {
      return res
        .status(400)
        .json({ success: false, message: "Invalid transaction" });
    }

    tx.status = "failed";
    tx.failureReason = reason;
    tx.processedAt = new Date();
    tx.processedBy = req.admin._id;
    await tx.save();

    await Notification.create({
      user: tx.user,
      title: "Crypto Deposit Rejected",
      message: `Your crypto deposit was rejected. Reason: ${reason}`,
      type: "transaction",
    });

    res.json({ success: true, message: "Deposit rejected", transaction: tx });
  } catch (err) {
    console.error("Reject Crypto Deposit Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
