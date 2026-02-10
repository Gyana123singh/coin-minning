const mongoose = require("mongoose");

const miningSessionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      required: true,
    },
    coinsEarned: {
      type: Number,
      default: 0,
    },
    expectedCoins: {
      type: Number,
      default: 0,
    },
    baseRate: {
      type: Number,
      required: true,
    },
    referralBoost: {
      type: Number,
      default: 0,
    },
    levelBoost: {
      type: Number,
      default: 0,
    },
    totalRate: {
      type: Number,
      required: true,
    },
    boostPercent: {
      type: Number,
      default: 0, // total boost percentage applied
    },
    lastBoostAt: {
      type: Date,
      default: null, // when last boost was applied
    },

    status: {
      type: String,
      enum: ["active", "completed", "cancelled", "expired"],
      default: "active",
    },
  },
  {
    timestamps: true,
  },
);

// Index for faster queries
miningSessionSchema.index({ user: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model("MiningSession", miningSessionSchema);
