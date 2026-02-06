const mongoose = require("mongoose");

const referralSchema = new mongoose.Schema(
  {
    referrer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    referred: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["direct", "indirect"],
      required: true,
    },
    level: {
      type: Number,
      default: 1, // 1 = direct, 2+ = indirect
    },
    coinsEarned: {
      type: Number,
      default: 0, // Default direct referral bonus
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

// Index for faster queries
referralSchema.index({ referrer: 1, type: 1 });
referralSchema.index({ referred: 1 });

module.exports = mongoose.model("Referral", referralSchema);
