const Transaction = require("../../models/Transaction");
const PaymentProof = require("../../models/PaymentProof");
const User = require("../../models/User");
const Wallet = require("../../models/Wallet");
const Notification = require("../../models/Notification");
const Settings = require("../../models/Settings");
const CryptoNetwork = require("../../models/CryptoNetwork");

// @desc    Get all transactions
// @route   GET /api/admin/transactions
// @access  Private/Admin
exports.getAllTransactions = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      type,
      status,
      search,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    // Build query
    const query = {};

    if (type && type !== "all") {
      query.type = type;
    }

    if (status && status !== "all") {
      query.status = status;
    }

    // Build sort
    const sort = {};
    sort[sortBy] = sortOrder === "asc" ? 1 : -1;

    // Execute query with pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const transactions = await Transaction.find(query)
      .populate("user", "name email avatar")
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Transaction.countDocuments(query);

    res.status(200).json({
      success: true,
      transactions,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total,
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    console.error("Get All Transactions Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// @desc    Get pending withdrawals
// @route   GET /api/admin/transactions/withdrawals/pending
// @access  Private/Admin
exports.getPendingWithdrawals = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const withdrawals = await Transaction.find({
      type: "withdrawal",
      status: "pending",
    })
      .populate("user", "name email phone avatar")
      .sort("-createdAt")
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Transaction.countDocuments({
      type: "withdrawal",
      status: "pending",
    });

    res.status(200).json({
      success: true,
      withdrawals,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total,
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    console.error("Get Pending Withdrawals Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// @desc    Approve withdrawal
// @route   PUT /api/admin/transactions/withdrawals/:id/approve
// @access  Private/Admin
exports.approveWithdrawal = async (req, res) => {
  try {
    const { transactionId, notes } = req.body;

    const transaction = await Transaction.findById(req.params.id);

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
      });
    }

    if (transaction.type !== "withdrawal" || transaction.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Invalid transaction",
      });
    }

    // Update transaction
    transaction.status = "completed";
    transaction.processedAt = new Date();
    transaction.processedBy = req.admin._id;
    if (transactionId) transaction.externalTransactionId = transactionId;
    if (notes) transaction.adminNotes = notes;
    await transaction.save();

    // Notify user
    await Notification.create({
      user: transaction.user,
      title: "Withdrawal Approved",
      message: `Your withdrawal of ${transaction.amount} coins has been approved and processed.`,
      type: "transaction",
    });

    res.status(200).json({
      success: true,
      message: "Withdrawal approved successfully",
      transaction,
    });
  } catch (error) {
    console.error("Approve Withdrawal Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// @desc    Reject withdrawal
// @route   PUT /api/admin/transactions/withdrawals/:id/reject
// @access  Private/Admin
exports.rejectWithdrawal = async (req, res) => {
  try {
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: "Please provide a rejection reason",
      });
    }

    const transaction = await Transaction.findById(req.params.id);

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
      });
    }

    if (transaction.type !== "withdrawal" || transaction.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Invalid transaction",
      });
    }

    // Update transaction
    transaction.status = "failed";
    transaction.failureReason = reason;
    transaction.processedAt = new Date();
    transaction.processedBy = req.admin._id;
    await transaction.save();

    // Refund coins to wallet based on wallet type
    const wallet = await Wallet.findOne({ user: transaction.user });
    if (wallet) {
      const walletType = transaction.metadata?.walletType || "auto";

      if (walletType === "mining") {
        await wallet.unlockMiningCoins(transaction.coins);
      } else if (walletType === "purchase") {
        await wallet.unlockPurchaseCoins(transaction.coins);
      } else {
        // Legacy: just unlock from total
        await wallet.unlockCoins(transaction.coins);
      }
    }

    // Notify user
    await Notification.create({
      user: transaction.user,
      title: "Withdrawal Rejected",
      message: `Your withdrawal of ${transaction.coins} coins was rejected. Reason: ${reason}. Coins have been refunded to your wallet.`,
      type: "transaction",
    });

    res.status(200).json({
      success: true,
      message: "Withdrawal rejected and coins refunded",
      transaction,
    });
  } catch (error) {
    console.error("Reject Withdrawal Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// @desc    Get transaction statistics
// @route   GET /api/admin/transactions/stats
// @access  Private/Admin
exports.getTransactionStats = async (req, res) => {
  try {
    const totalTransactions = await Transaction.countDocuments();

    // Withdrawals
    const pendingWithdrawals = await Transaction.countDocuments({
      type: "withdrawal",
      status: "pending",
    });

    const completedWithdrawalsResult = await Transaction.aggregate([
      { $match: { type: "withdrawal", status: "completed" } },
      { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } },
    ]);
    const totalWithdrawals = completedWithdrawalsResult[0]?.total || 0;
    const withdrawalCount = completedWithdrawalsResult[0]?.count || 0;

    // Purchases
    const purchasesResult = await Transaction.aggregate([
      { $match: { type: "purchase", status: "completed" } },
      { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } },
    ]);
    const totalPurchases = purchasesResult[0]?.total || 0;
    const purchaseCount = purchasesResult[0]?.count || 0;

    // Mining rewards
    const miningResult = await Transaction.aggregate([
      { $match: { type: "mining" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const totalMiningRewards = miningResult[0]?.total || 0;

    // Referral bonuses
    const referralResult = await Transaction.aggregate([
      { $match: { type: "referral" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const totalReferralBonuses = referralResult[0]?.total || 0;

    res.status(200).json({
      success: true,
      stats: {
        total: totalTransactions,
        withdrawals: {
          pending: pendingWithdrawals,
          completed: withdrawalCount,
          totalAmount: totalWithdrawals,
        },
        purchases: {
          count: purchaseCount,
          totalAmount: totalPurchases,
        },
        miningRewards: totalMiningRewards,
        referralBonuses: totalReferralBonuses,
      },
    });
  } catch (error) {
    console.error("Transaction Stats Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ==================== PAYMENT PROOF MANAGEMENT ====================

// @desc    Get all payment proofs
// @route   GET /api/admin/payments
// @access  Private/Admin
exports.getAllPaymentProofs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      search,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    // Build query
    const query = {};

    if (status && status !== "all") {
      query.status = status;
    }

    // Build sort
    const sort = {};
    sort[sortBy] = sortOrder === "asc" ? 1 : -1;

    // Execute query with pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    let proofs = await PaymentProof.find(query)
      .populate("user", "name email phone avatar")
      .populate("coinPackage", "name coins bonusCoins")
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    // Filter by search if provided
    if (search) {
      proofs = proofs.filter(
        (proof) =>
          proof.user?.name?.toLowerCase().includes(search.toLowerCase()) ||
          proof.user?.email?.toLowerCase().includes(search.toLowerCase()) ||
          proof.utr?.toLowerCase().includes(search.toLowerCase()),
      );
    }

    const total = await PaymentProof.countDocuments(query);

    res.status(200).json({
      success: true,
      payments: proofs,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total,
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    console.error("Get All Payment Proofs Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// @desc    Get payment proof statistics
// @route   GET /api/admin/payments/stats
// @access  Private/Admin
exports.getPaymentStats = async (req, res) => {
  try {
    const total = await PaymentProof.countDocuments();
    const pending = await PaymentProof.countDocuments({ status: "pending" });
    const approved = await PaymentProof.countDocuments({ status: "approved" });
    const rejected = await PaymentProof.countDocuments({ status: "rejected" });

    // Total collected amount
    const collectedResult = await PaymentProof.aggregate([
      { $match: { status: "approved" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const totalCollected = collectedResult[0]?.total || 0;

    // Today's collections
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayResult = await PaymentProof.aggregate([
      { $match: { status: "approved", reviewedAt: { $gte: today } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const todayCollected = todayResult[0]?.total || 0;

    res.status(200).json({
      success: true,
      stats: {
        total,
        pending,
        approved,
        rejected,
        totalCollected,
        todayCollected,
      },
    });
  } catch (error) {
    console.error("Payment Stats Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// @desc    Get single payment proof
// @route   GET /api/admin/payments/:id
// @access  Private/Admin
exports.getPaymentProofById = async (req, res) => {
  try {
    const proof = await PaymentProof.findById(req.params.id)
      .populate("user", "name email phone avatar")
      .populate("coinPackage", "name coins bonusCoins price")
      .populate("reviewedBy", "name email");

    if (!proof) {
      return res.status(404).json({
        success: false,
        message: "Payment proof not found",
      });
    }

    res.status(200).json({
      success: true,
      payment: proof,
    });
  } catch (error) {
    console.error("Get Payment Proof Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// @desc    Approve payment proof
// @route   PUT /api/admin/payments/:id/approve
// @access  Private/Admin
exports.approvePaymentProof = async (req, res) => {
  try {
    const { notes } = req.body;

    const proof = await PaymentProof.findById(req.params.id);

    if (!proof) {
      return res.status(404).json({
        success: false,
        message: "Payment proof not found",
      });
    }

    if (proof.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Payment has already been processed",
      });
    }

    // Update proof status
    proof.status = "approved";
    proof.reviewedBy = req.admin._id;
    proof.reviewedAt = new Date();
    if (notes) proof.adminNotes = notes;
    await proof.save();

    // Credit coins to user's PURCHASE WALLET (not mining wallet)
    if (proof.coinsToCredit > 0) {
      let wallet = await Wallet.findOne({ user: proof.user });
      if (!wallet) {
        wallet = await Wallet.create({ user: proof.user });
      }

      // Add to PURCHASE wallet specifically
      await wallet.addPurchaseCoins(proof.coinsToCredit);

      // Create transaction record
      await Transaction.create({
        user: proof.user,
        type: "purchase",
        amount: proof.coinsToCredit,
        coins: proof.coinsToCredit,
        status: "completed",
        description: `Coin purchase - ${proof.coinsToCredit} coins`,
        paymentProof: proof._id,
        metadata: {
          walletType: "purchase",
          packageId: proof.coinPackage,
        },
      });
    }

    // Notify user
    await Notification.create({
      user: proof.user,
      title: "Payment Approved",
      message: `Your payment of ₹${proof.amount} has been verified. ${proof.coinsToCredit} coins have been credited to your Purchase Wallet.`,
      type: "transaction",
    });

    res.status(200).json({
      success: true,
      message: "Payment approved and coins credited to Purchase Wallet",
      payment: proof,
    });
  } catch (error) {
    console.error("Approve Payment Proof Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// @desc    Reject payment proof
// @route   PUT /api/admin/payments/:id/reject
// @access  Private/Admin
exports.rejectPaymentProof = async (req, res) => {
  try {
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: "Please provide a rejection reason",
      });
    }

    const proof = await PaymentProof.findById(req.params.id);

    if (!proof) {
      return res.status(404).json({
        success: false,
        message: "Payment proof not found",
      });
    }

    if (proof.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Payment has already been processed",
      });
    }

    // Update proof status
    proof.status = "rejected";
    proof.rejectionReason = reason;
    proof.reviewedBy = req.admin._id;
    proof.reviewedAt = new Date();
    await proof.save();

    // Notify user
    await Notification.create({
      user: proof.user,
      title: "Payment Rejected",
      message: `Your payment of ₹${proof.amount} was rejected. Reason: ${reason}`,
      type: "transaction",
    });

    res.status(200).json({
      success: true,
      message: "Payment rejected",
      payment: proof,
    });
  } catch (error) {
    console.error("Reject Payment Proof Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// @desc    Get/Update payment settings (UPI ID, QR Code)
// @route   GET/PUT /api/admin/payments/settings
// @access  Private/Admin
exports.getPaymentSettings = async (req, res) => {
  try {
    const settings = await Settings.getSettings();

    res.status(200).json({
      success: true,
      settings: {
        upiId: settings.paymentUpiId || "",
        upiName: settings.upiName || "",
        qrCode: settings.paymentUpiQrCode || "",
        minDeposit: settings.minDeposit || 100,
        maxDeposit: settings.maxDeposit || 100000,
      },
    });
  } catch (error) {
    console.error("Get Payment Settings Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.updatePaymentSettings = async (req, res) => {
  try {
    const { upiId, upiName, qrCode, minDeposit, maxDeposit } = req.body;

    if (upiId !== undefined) {
      await Settings.setSetting("paymentUpiId", upiId, "UPI ID for payments");
    }
    if (upiName !== undefined) {
      await Settings.setSetting("upiName", upiName, "UPI Account Name");
    }
    if (qrCode !== undefined) {
      await Settings.setSetting(
        "paymentUpiQrCode",
        qrCode,
        "Payment QR Code URL",
      );
    }
    if (minDeposit !== undefined) {
      await Settings.setSetting(
        "minDeposit",
        minDeposit,
        "Minimum deposit amount",
      );
    }
    if (maxDeposit !== undefined) {
      await Settings.setSetting(
        "maxDeposit",
        maxDeposit,
        "Maximum deposit amount",
      );
    }

    res.status(200).json({
      success: true,
      message: "Payment settings updated successfully",
    });
  } catch (error) {
    console.error("Update Payment Settings Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// @desc    Upload QR Code for payments
// @route   POST /api/admin/payments/upload-qr
// @access  Private/Admin
exports.uploadQRCode = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please upload a QR code image",
      });
    }

    const qrCodeUrl = req.file.path;

    // Save to settings
    await Settings.setSetting(
      "paymentUpiQrCode",
      qrCodeUrl,
      "Payment QR Code URL",
    );

    res.status(200).json({
      success: true,
      message: "QR code uploaded successfully",
      qrCode: qrCodeUrl,
    });
  } catch (error) {
    console.error("Upload QR Code Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// @desc    Submit UPI payment proof (UTR + screenshot)
// @route   POST /api/coins/payments/proof
// @access  Private
exports.submitPaymentProof = async (req, res) => {
  try {
    const { utr, amount, coinsToCredit, coinPackage } = req.body;

    if (!utr || !amount) {
      return res.status(400).json({
        success: false,
        message: "UTR and amount are required",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Payment screenshot is required",
      });
    }

    const settings = await Settings.getSettings();

    // If coinsToCredit not sent, calculate from settings
    const rate = settings.coinPricePerDollar || 10; // 1$ = 10 coins
    const finalCoins =
      coinsToCredit && Number(coinsToCredit) > 0
        ? Number(coinsToCredit)
        : Number(amount) * rate;

    // Prevent duplicate UTR
    const existing = await PaymentProof.findOne({ utr });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "This UTR has already been submitted",
      });
    }

    const proof = await PaymentProof.create({
      user: req.user._id,
      utr,
      amount,
      coinsToCredit: finalCoins,
      screenshot: req.file.path,
      coinPackage: coinPackage || null,
      status: "pending",
    });

    // Notify user
    await Notification.create({
      user: req.user._id,
      type: "system",
      title: "Payment Submitted",
      message: `Your payment proof (UTR: ${utr}) has been submitted and is pending admin verification.`,
    });

    res.status(201).json({
      success: true,
      message:
        "Payment proof submitted successfully. Waiting for admin verification.",
      proof,
    });
  } catch (error) {
    console.error("Submit Payment Proof Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to submit payment proof",
    });
  }
};

// POST /api/admin/crypto-networks
exports.createCryptoNetwork = async (req, res) => {
  try {
    const network = await CryptoNetwork.create(req.body);
    res.json({ success: true, network });
  } catch (error) {
    console.error("Create Crypto Network Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create crypto network",
    });
  }
};

// PUT /api/admin/crypto-networks/:id
exports.updateCryptoNetwork = async (req, res) => {
  try {
    const network = await CryptoNetwork.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true },
    );

    if (!network) {
      return res
        .status(404)
        .json({ success: false, message: "Network not found" });
    }

    res.json({ success: true, network });
  } catch (error) {
    console.error("Update Crypto Network Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update crypto network",
    });
  }
};

// GET /api/admin/crypto-networks
exports.getAllCryptoNetworks = async (req, res) => {
  try {
    const networks = await CryptoNetwork.find();
    res.json({ success: true, networks });
  } catch (error) {
    console.error("Get All Crypto Networks Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch crypto networks",
    });
  }
};

// PUT /api/admin/transactions/:id/approve-crypto
exports.approveCryptoDeposit = async (req, res) => {
  try {
    const tx = await Transaction.findById(req.params.id);

    if (!tx || tx.status !== "pending" || tx.paymentMethod !== "crypto") {
      return res
        .status(400)
        .json({ success: false, message: "Invalid transaction" });
    }

    // Mark completed
    tx.status = "completed";
    tx.processedAt = new Date();
    tx.processedBy = req.admin._id;
    await tx.save();

    // Credit PURCHASE wallet
    let wallet = await Wallet.findOne({ user: tx.user });
    if (!wallet) wallet = await Wallet.create({ user: tx.user });

    await wallet.addPurchaseCoins(tx.coins);

    // Notify user
    await Notification.create({
      user: tx.user,
      title: "Crypto Deposit Approved",
      message: `Your crypto deposit has been approved. ${tx.coins} coins added to your wallet.`,
      type: "transaction",
    });

    res.json({ success: true, message: "Deposit approved and coins credited" });
  } catch (error) {
    console.error("Approve Crypto Deposit Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to approve crypto deposit",
    });
  }
};
