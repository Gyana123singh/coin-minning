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
    boostEndTime: {
      type: Date,
      default: null, // when current 30-minute boost expires
    },
    boostRateBonus: {
      type: Number,
      default: 0, // rate bonus active during boost window
    },
    lastRewardCalcAt: {
      type: Date,
      default: null, // when rewards were last accrued
    },
    boostLockAt: {
      type: Date,
      default: null, // concurrency lock timestamp
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

module.exports = mongoose.models.MiningSession || mongoose.model("MiningSession", miningSessionSchema);
