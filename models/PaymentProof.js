const mongoose = require('mongoose');

const paymentProofSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  // Transaction reference
  transaction: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction',
  },
  // UTR/Reference number
  utr: {
    type: String,
    required: [true, 'Please provide UTR number'],
    trim: true,
    uppercase: true,
  },
  // Payment details
  amount: {
    type: Number,
    required: [true, 'Please provide payment amount'],
    min: 0,
  },
  currency: {
    type: String,
    default: 'INR',
  },
  // Payment method details
  paymentMethod: {
    type: String,
    enum: ['upi', 'bank_transfer', 'card', 'other'],
    default: 'upi',
  },
  upiId: {
    type: String,
    trim: true,
  },
  // Screenshot proof
  screenshot: {
    type: String,
    required: [true, 'Please provide payment screenshot'],
  },
  // Purpose
  purpose: {
    type: String,
    enum: ['coin_purchase', 'ownership_completion', 'premium_upgrade', 'other'],
    default: 'coin_purchase',
  },
  // Coin package if applicable
  coinPackage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CoinPackage',
  },
  coinsToCredit: {
    type: Number,
    default: 0,
  },
  // Status
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
  // Admin review
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
  },
  reviewedAt: {
    type: Date,
  },
  rejectionReason: {
    type: String,
  },
  // Notes
  adminNotes: {
    type: String,
  },
}, {
  timestamps: true,
});

// Index for efficient queries
paymentProofSchema.index({ user: 1, status: 1 });
paymentProofSchema.index({ utr: 1 });
paymentProofSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('PaymentProof', paymentProofSchema);
