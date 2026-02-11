const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: [
        "deposit",
        "withdrawal",
        "purchase",
        "mining",
        "referral",
        "bonus",
        "transfer",
      ],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    coins: {
      type: Number,
      default: 0,
    },
    currency: {
      type: String,
      enum: ["USD", "INR", "EUR", "COIN"],
      default: "COIN",
    },
    status: {
      type: String,
      enum: [
        "pending",
        "processing",
        "completed",
        "failed",
        "cancelled",
        "refunded",
      ],
      default: "pending",
    },
    // Payment details
    paymentMethod: {
      type: String,
      enum: ["upi", "bank", "card", "crypto", "wallet", "system"],
      default: "system",
    },
    paymentDetails: {
      upiId: String,
      bankAccount: String,
      bankIfsc: String,
      bankName: String,
      cardLast4: String,
      cryptoAddress: String,
      cryptoNetwork: String,
    },
    // Transaction reference
    transactionId: {
      type: String,
      unique: true,
      sparse: true,
    },
    externalReference: {
      type: String, // Payment gateway reference
    },
    // For withdrawals
    withdrawalAddress: {
      type: String,
    },
    // Proof of payment (for deposits)
    paymentProof: {
      type: String, // Cloudinary URL
    },
    // Description
    description: {
      type: String,
    },
    // Admin notes
    adminNotes: {
      type: String,
    },
    // Processing info
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
    },
    processedAt: {
      type: Date,
    },
    // Balance after transaction
    balanceAfter: {
      type: Number,
    },
    // Failure reason
    failureReason: {
      type: String,
    },
    // Metadata for dual wallet system and other info
    metadata: {
      walletType: {
        type: String,
        enum: ["mining", "purchase", "referral", "all", "auto"],
      },
      packageId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "CoinPackage",
      },
      // 👇 ADD THESE
      cryptoNetworkId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "CryptoNetwork",
      },
      txHash: String,
      amountCrypto: Number,

      fromWallet: String,
      toWallet: String,
      internalTransfer: Boolean,
    },
  },
  {
    timestamps: true,
  },
);

// Generate transaction ID before saving
transactionSchema.pre("save", function (next) {
  if (!this.transactionId) {
    const prefix = this.type.substring(0, 3).toUpperCase();
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    this.transactionId = `${prefix}-${timestamp}-${random}`;
  }
  next();
});

// Indexes
// Note: transactionId already has unique: true which creates an index
transactionSchema.index({ user: 1, type: 1, createdAt: -1 });
transactionSchema.index({ status: 1, createdAt: -1 });
transactionSchema.index({ "metadata.walletType": 1 });

module.exports = mongoose.model("Transaction", transactionSchema);
