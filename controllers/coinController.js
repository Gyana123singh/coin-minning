const User = require("../models/User");
const Wallet = require("../models/Wallet");
const Transaction = require("../models/Transaction");
const CoinPackage = require("../models/CoinPackage");
const Notification = require("../models/Notification");
const Settings = require("../models/Settings");
const { parsePagination } = require("../utils/helpers");
// routes: GET /api/coins/crypto-networks
const CryptoNetwork = require("../models/CryptoNetwork");

// @desc    Get available coin packages
// @route   GET /api/coins/packages
// @access  Public
const getCoinPackages = async (req, res) => {
  try {
    const packages = await CoinPackage.find({ isActive: true }).sort({
      sortOrder: 1,
    });

    // Filter out expired packages
    const availablePackages = packages.filter((pkg) => pkg.isAvailable());

    res.status(200).json({
      success: true,
      packages: availablePackages.map((pkg) => ({
        id: pkg._id,
        name: pkg.name,
        description: pkg.description,
        coins: pkg.coins,
        bonusCoins: pkg.bonusCoins,
        totalCoins: pkg.totalCoins,
        price: pkg.price,
        originalPrice: pkg.originalPrice,
        discountPercent: pkg.discountPercent,
        currency: pkg.currency,
        badge: pkg.badge,
        isFeatured: pkg.isFeatured,
        icon: pkg.icon,
      })),
    });
  } catch (error) {
    console.error("Get Coin Packages Error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to get coin packages" });
  }
};

// @desc    Get coin exchange rate
// @route   GET /api/coins/rate
// @access  Public
const getCoinRate = async (req, res) => {
  try {
    const settings = await Settings.getSettings();

    res.status(200).json({
      success: true,
      rate: {
        coinValue: settings.coinValue || 0.01,
        currency: "USD",
        lastUpdated: new Date(),
      },
    });
  } catch (error) {
    console.error("Get Coin Rate Error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to get coin rate" });
  }
};

// @desc    Purchase coins (initiate)
// @route   POST /api/coins/purchase
// @access  Private
const purchaseCoins = async (req, res) => {
  try {
    const { packageId, paymentMethod } = req.body;

    if (!packageId) {
      return res
        .status(400)
        .json({ success: false, message: "Package ID is required" });
    }

    const coinPackage = await CoinPackage.findById(packageId);
    if (!coinPackage || !coinPackage.isAvailable()) {
      return res
        .status(404)
        .json({ success: false, message: "Package not available" });
    }

    // Check purchase limits
    if (coinPackage.purchaseLimit > 0) {
      const purchaseCount = await Transaction.countDocuments({
        user: req.user._id,
        type: "purchase",
        "metadata.packageId": packageId,
        status: "completed",
      });
      if (purchaseCount >= coinPackage.purchaseLimit) {
        return res.status(400).json({
          success: false,
          message: "You have reached the purchase limit for this package",
        });
      }
    }

    // Create pending transaction
    const transaction = await Transaction.create({
      user: req.user._id,
      type: "purchase",
      amount: coinPackage.price,
      coins: coinPackage.totalCoins,
      currency: coinPackage.currency,
      status: "pending",
      paymentMethod: paymentMethod || "upi",
      description: `Purchase of ${coinPackage.name} - ${coinPackage.totalCoins} coins`,
    });

    res.status(200).json({
      success: true,
      message: "Purchase initiated",
      transaction: {
        id: transaction._id,
        transactionId: transaction.transactionId,
        amount: transaction.amount,
        coins: transaction.coins,
        currency: transaction.currency,
        status: transaction.status,
      },
      package: {
        name: coinPackage.name,
        coins: coinPackage.coins,
        bonusCoins: coinPackage.bonusCoins,
        totalCoins: coinPackage.totalCoins,
        price: coinPackage.price,
      },
      paymentInfo: {
        // This would be your payment gateway info
        upiId: process.env.PAYMENT_UPI_ID || "payments@miningapp",
        bankDetails: {
          accountName: process.env.PAYMENT_ACCOUNT_NAME || "Mining App Pvt Ltd",
          accountNumber: process.env.PAYMENT_ACCOUNT_NUMBER,
          ifscCode: process.env.PAYMENT_IFSC_CODE,
          bankName: process.env.PAYMENT_BANK_NAME,
        },
      },
    });
  } catch (error) {
    console.error("Purchase Coins Error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to initiate purchase" });
  }
};

// @desc    Submit payment proof
// @route   POST /api/coins/purchase/:transactionId/proof
// @access  Private
const submitPaymentProof = async (req, res) => {
  try {
    const { transactionId } = req.params;

    const transaction = await Transaction.findOne({
      _id: transactionId,
      user: req.user._id,
      type: "purchase",
      status: "pending",
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found or already processed",
      });
    }

    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "Please upload payment screenshot" });
    }

    transaction.paymentProof = req.file.path;
    transaction.status = "processing";
    await transaction.save();

    // Notify admin (you could implement admin notification here)

    res.status(200).json({
      success: true,
      message:
        "Payment proof submitted. Your purchase will be verified shortly.",
      transaction: {
        id: transaction._id,
        transactionId: transaction.transactionId,
        status: transaction.status,
      },
    });
  } catch (error) {
    console.error("Submit Payment Proof Error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to submit payment proof" });
  }
};

// @desc    Cancel purchase
// @route   POST /api/coins/purchase/:transactionId/cancel
// @access  Private
const cancelPurchase = async (req, res) => {
  try {
    const { transactionId } = req.params;

    const transaction = await Transaction.findOne({
      _id: transactionId,
      user: req.user._id,
      type: "purchase",
      status: "pending",
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found or cannot be cancelled",
      });
    }

    transaction.status = "cancelled";
    await transaction.save();

    res.status(200).json({
      success: true,
      message: "Purchase cancelled",
    });
  } catch (error) {
    console.error("Cancel Purchase Error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to cancel purchase" });
  }
};

// @desc    Get purchase history
// @route   GET /api/coins/purchases
// @access  Private
const getPurchaseHistory = async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);

    const purchases = await Transaction.find({
      user: req.user._id,
      type: "purchase",
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Transaction.countDocuments({
      user: req.user._id,
      type: "purchase",
    });

    // Summary
    const summary = await Transaction.aggregate([
      { $match: { user: req.user._id, type: "purchase", status: "completed" } },
      {
        $group: {
          _id: null,
          totalPurchases: { $sum: 1 },
          totalCoins: { $sum: "$coins" },
          totalSpent: { $sum: "$amount" },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      purchases,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      summary: summary[0] || {
        totalPurchases: 0,
        totalCoins: 0,
        totalSpent: 0,
      },
    });
  } catch (error) {
    console.error("Get Purchase History Error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to get purchase history" });
  }
};

// @desc    Transfer coins to another user
// @route   POST /api/coins/transfer
// @access  Private
const transferCoins = async (req, res) => {
  try {
    const { recipientEmail, amount, note, fromWallet } = req.body; // fromWallet: 'mining', 'purchase', or 'auto'

    if (!recipientEmail || !amount || amount <= 0) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid transfer details" });
    }

    // Find recipient
    const recipient = await User.findOne({
      email: recipientEmail.toLowerCase(),
    });
    if (!recipient) {
      return res
        .status(404)
        .json({ success: false, message: "Recipient not found" });
    }

    if (recipient._id.toString() === req.user._id.toString()) {
      return res
        .status(400)
        .json({ success: false, message: "Cannot transfer to yourself" });
    }

    // Check sender wallet
    const senderWallet = await Wallet.findOne({ user: req.user._id });
    if (!senderWallet) {
      return res
        .status(400)
        .json({ success: false, message: "Wallet not found" });
    }

    // Determine source wallet
    const sourceWallet = fromWallet || "auto";
    let sourceBalance;

    if (sourceWallet === "mining") {
      sourceBalance = senderWallet.availableMiningCoins;
    } else if (sourceWallet === "purchase") {
      sourceBalance = senderWallet.availablePurchaseCoins;
    } else {
      sourceBalance = senderWallet.availableCoins;
    }

    if (sourceBalance < amount) {
      return res
        .status(400)
        .json({ success: false, message: "Insufficient balance" });
    }

    // Get or create recipient wallet
    let recipientWallet = await Wallet.findOne({ user: recipient._id });
    if (!recipientWallet) {
      recipientWallet = await Wallet.create({
        user: recipient._id,
        miningBalance: recipient.miningStats?.totalCoins || 0,
      });
    }

    // Deduct from sender based on wallet type
    if (sourceWallet === "mining") {
      await senderWallet.deductMiningCoins(amount);
    } else if (sourceWallet === "purchase") {
      await senderWallet.deductPurchaseCoins(amount);
    } else {
      await senderWallet.deductCoins(amount);
    }

    // Add to recipient's purchase wallet (received coins go to purchase wallet)
    await recipientWallet.addPurchaseCoins(amount);

    // Update user model coins too (for backward compatibility)
    const sender = await User.findById(req.user._id);
    sender.miningStats.totalCoins = Math.max(
      0,
      (sender.miningStats?.totalCoins || 0) - amount,
    );
    await sender.save();

    recipient.miningStats.totalCoins =
      (recipient.miningStats?.totalCoins || 0) + amount;
    await recipient.save();

    // Create transactions
    const senderTransaction = await Transaction.create({
      user: req.user._id,
      type: "transfer",
      amount: -amount,
      coins: -amount,
      currency: "COIN",
      status: "completed",
      description: `Transfer to ${recipient.name} (${recipientEmail})`,
      balanceAfter: senderWallet.miningBalance + senderWallet.purchaseBalance,
      metadata: {
        walletType: sourceWallet,
      },
    });

    await Transaction.create({
      user: recipient._id,
      type: "transfer",
      amount: amount,
      coins: amount,
      currency: "COIN",
      status: "completed",
      description: `Transfer from ${sender.name}${note ? `: ${note}` : ""}`,
      balanceAfter:
        recipientWallet.miningBalance + recipientWallet.purchaseBalance,
      metadata: {
        walletType: "purchase", // Received coins go to purchase wallet
      },
    });

    // Notify recipient
    await Notification.create({
      user: recipient._id,
      type: "reward",
      title: "Coins Received! 🎁",
      message: `${sender.name} sent you ${amount} coins!${note ? ` Note: ${note}` : ""}`,
    });

    res.status(200).json({
      success: true,
      message: `Successfully transferred ${amount} coins to ${recipient.name}`,
      transaction: {
        id: senderTransaction._id,
        transactionId: senderTransaction.transactionId,
        coins: amount,
        recipient: recipient.name,
        fromWallet: sourceWallet,
      },
      wallets: {
        mining: senderWallet.miningBalance,
        purchase: senderWallet.purchaseBalance,
        total: senderWallet.miningBalance + senderWallet.purchaseBalance,
      },
    });
  } catch (error) {
    console.error("Transfer Coins Error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to transfer coins" });
  }
};

// @desc    Get coin balance (both wallets)
// @route   GET /api/coins/balance
// @access  Private
const getCoinBalance = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    let wallet = await Wallet.findOne({ user: req.user._id });
    const settings = await Settings.getSettings();

    // Create wallet if doesn't exist
    if (!wallet) {
      wallet = await Wallet.create({
        user: req.user._id,
        miningBalance: user.miningStats?.totalCoins || 0,
        totalMined: user.miningStats?.totalMined || 0,
      });
    }

    const coinValue = settings.coinValue || 0.01;

    res.status(200).json({
      success: true,
      balance: {
        // Total balance (all wallets combined)
        totalCoins:
          wallet.miningBalance +
          wallet.purchaseBalance +
          wallet.referralBalance,
        totalAvailable: wallet.availableCoins,
        totalLocked: wallet.lockedCoins,
        totalFiatValue:
          (wallet.miningBalance +
            wallet.purchaseBalance +
            wallet.referralBalance) *
          coinValue,

        // Mining Wallet
        miningWallet: {
          balance: wallet.miningBalance,
          available: wallet.availableMiningCoins,
          locked: wallet.miningLockedCoins,
          totalMined: wallet.totalMined,
          fiatValue: wallet.miningBalance * coinValue,
        },

        // Purchase Wallet
        purchaseWallet: {
          balance: wallet.purchaseBalance,
          available: wallet.availablePurchaseCoins,
          locked: wallet.purchaseLockedCoins,
          totalPurchased: wallet.totalPurchased,
          fiatValue: wallet.purchaseBalance * coinValue,
        },

        // Referral Wallet
        referralWallet: {
          balance: wallet.referralBalance,
          totalEarned: wallet.totalReferralEarned,
          fiatValue: wallet.referralBalance * coinValue,
        },

        currency: "USD",
        coinValue: coinValue,
      },
    });
  } catch (error) {
    console.error("Get Coin Balance Error:", error);
    res.status(500).json({ success: false, message: "Failed to get balance" });
  }
};

// @desc    Get payment settings (QR code, UPI ID, etc.)
// @route   GET /api/coins/payment-info
// @access  Private
const getPaymentInfo = async (req, res) => {
  try {
    const settings = await Settings.getSettings();

    res.status(200).json({
      success: true,
      paymentInfo: {
        upiId: settings.paymentUpiId || "",
        qrCodeUrl: settings.paymentUpiQrCode || "",
        bankName: settings.paymentBankName || "",
        accountNumber: settings.paymentAccountNumber || "",
        ifscCode: settings.paymentIfscCode || "",
        accountHolderName: settings.paymentAccountHolderName || "",
        coinPricePerDollar: settings.coinPricePerDollar || 10,
        coinValue: settings.coinValue || 0.01,
      },
    });
  } catch (error) {
    console.error("Get Payment Info Error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to get payment info" });
  }
};

// @desc    Submit UPI transaction ID for coin purchase
// @route   POST /api/coins/submit-transaction
// @access  Private
const submitUpiTransaction = async (req, res) => {
  try {
    const { transactionId, amount, upiApp } = req.body;

    if (!transactionId || !amount) {
      return res.status(400).json({
        success: false,
        message: "Transaction ID and amount are required",
      });
    }

    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Amount must be greater than 0",
      });
    }

    // Check if transaction ID already submitted
    const existingTransaction = await Transaction.findOne({
      "metadata.upiTransactionId": transactionId,
    });

    if (existingTransaction) {
      return res.status(400).json({
        success: false,
        message: "This transaction ID has already been submitted",
      });
    }

    const settings = await Settings.getSettings();
    const coinPricePerDollar = settings.coinPricePerDollar || 10;
    const coinsToReceive = amount * coinPricePerDollar;

    // Create pending transaction for admin to verify
    const transaction = await Transaction.create({
      user: req.user._id,
      type: "purchase",
      amount: amount,
      coins: coinsToReceive,
      currency: "USD",
      status: "pending",
      paymentMethod: "upi",
      description: `Coin purchase - $${amount} for ${coinsToReceive} coins`,
      metadata: {
        upiTransactionId: transactionId,
        upiApp: upiApp || "unknown",
        coinPriceAtPurchase: coinPricePerDollar,
        submittedAt: new Date(),
      },
    });

    // Notify user
    await Notification.create({
      user: req.user._id,
      type: "system",
      title: "Purchase Submitted",
      message: `Your purchase of ${coinsToReceive} coins for $${amount} is pending verification. Transaction ID: ${transactionId}`,
    });

    res.status(200).json({
      success: true,
      message:
        "Transaction submitted successfully! Your coins will be credited after verification.",
      transaction: {
        id: transaction._id,
        transactionId: transaction.transactionId,
        upiTransactionId: transactionId,
        amount: amount,
        coins: coinsToReceive,
        status: "pending",
      },
    });
  } catch (error) {
    console.error("Submit UPI Transaction Error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to submit transaction" });
  }
};

// @desc    Get my wallet
// @route   GET /api/coins/me/wallet
// @access  Private
const getMyWallet = async (req, res) => {
  try {
    let wallet = await Wallet.findOne({ user: req.user._id });

    if (!wallet) {
      wallet = await Wallet.create({ user: req.user._id });
    }

    res.status(200).json({
      success: true,
      wallet: {
        miningBalance: wallet.miningBalance,
        purchaseBalance: wallet.purchaseBalance,
        referralBalance: wallet.referralBalance,
        coinBalance: wallet.coinBalance,
        totalEarned: wallet.totalEarned,
        totalMined: wallet.totalMined,
        totalReferralEarned: wallet.totalReferralEarned,
        lockedCoins: wallet.lockedCoins,
      },
    });
  } catch (error) {
    console.error("Get My Wallet Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// @desc    Get my transactions
// @route   GET /api/coins/me/transactions
// @access  Private
const getMyTransactions = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const skip = (page - 1) * limit;

    const transactions = await Transaction.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Transaction.countDocuments({ user: req.user._id });

    res.status(200).json({
      success: true,
      transactions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get My Transactions Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// @route POST /api/coins/create-payment-link
// @access Private
const createUpiPaymentLink = async (req, res) => {
  try {
    const { amountUSD } = req.body;

    if (!amountUSD || amountUSD <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid amount",
      });
    }

    const settings = await Settings.getSettings();

    const rate = settings.coinPricePerDollar || 10; // $1 = 10 CM
    const coins = amountUSD * rate;

    // Convert USD to INR if needed (example: 1 USD = 83 INR)
    const usdToInr = settings.usdToInrRate || 83;
    const amountINR = Math.round(amountUSD * usdToInr * 100) / 100;

    // Create transaction first
    const tx = await Transaction.create({
      user: req.user._id,
      type: "purchase",
      amount: amountUSD,
      coins: coins,
      currency: "USD",
      status: "pending",
      paymentMethod: "upi",
      description: `Coin purchase $${amountUSD} (${coins} CM)`,
      metadata: {
        amountINR,
        rate,
      },
    });

    // Your UPI details (from settings or env)
    const upiId = settings.paymentUpiId || "payments@miningapp";
    const merchantName = settings.paymentMerchantName || "Mining App";

    // UPI Deep Link
    const upiLink = `upi://pay?pa=${encodeURIComponent(
      upiId,
    )}&pn=${encodeURIComponent(merchantName)}&am=${amountINR}&cu=INR&tn=${encodeURIComponent(
      "TX-" + tx._id,
    )}`;

    res.json({
      success: true,
      paymentLink: upiLink,
      coins,
      amountUSD,
      amountINR,
      transactionId: tx._id,
      message: "UPI payment link created",
    });
  } catch (error) {
    console.error("Create UPI Link Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create payment link",
    });
  }
};

// routes: GET /api/coins/crypto-networks

const getCryptoNetworks = async (req, res) => {
  try {
    const networks = await CryptoNetwork.find({ isActive: true });
    res.json({ success: true, networks });
  } catch (error) {
    console.error("Get Crypto Networks Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch crypto networks",
    });
  }
};

const createCryptoDeposit = async (req, res) => {
  try {
    const { networkId, amountUSD, txHash } = req.body;

    if (!networkId || !amountUSD || !txHash) {
      return res
        .status(400)
        .json({ success: false, message: "Missing fields" });
    }

    const settings = await Settings.getSettings();
    const rate = settings.coinPricePerDollar || 10;
    const coins = amountUSD * rate;

    const tx = await Transaction.create({
      user: req.user._id,
      type: "purchase",
      amount: amountUSD,
      coins,
      currency: "USD",
      status: "pending",
      paymentMethod: "crypto",
      description: `Crypto deposit $${amountUSD}`,
      metadata: {
        cryptoNetworkId: networkId,
        txHash,
        amountCrypto: amountUSD,
        walletType: "purchase",
      },
    });

    res.json({
      success: true,
      message: "Deposit submitted. Waiting for admin verification.",
      transaction: tx,
    });
  } catch (error) {
    console.error("Create Crypto Deposit Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create crypto deposit",
    });
  }
};

module.exports = {
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
  createUpiPaymentLink,
  getCryptoNetworks,
  createCryptoDeposit,
};
