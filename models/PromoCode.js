const mongoose = require('mongoose');

const promoCodeSchema = new mongoose.Schema({
  code: {
    type: String,
    required: [true, 'Please provide a promo code'],
    unique: true,
    uppercase: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  // Reward type
  rewardType: {
    type: String,
    enum: ['coins', 'boost', 'discount_percent', 'discount_fixed'],
    default: 'coins',
  },
  rewardValue: {
    type: Number,
    required: [true, 'Please provide reward value'],
    min: 0,
  },
  // For boost rewards
  boostDuration: {
    type: Number, // in hours
    default: 24,
  },
  boostMultiplier: {
    type: Number,
    default: 1.5,
  },
  // Usage limits
  maxUses: {
    type: Number,
    default: 0, // 0 = unlimited
  },
  usedCount: {
    type: Number,
    default: 0,
  },
  maxUsesPerUser: {
    type: Number,
    default: 1,
  },
  // Minimum requirements
  minPurchaseAmount: {
    type: Number,
    default: 0,
  },
  minMiningDays: {
    type: Number,
    default: 0,
  },
  // Target users
  targetUsers: {
    type: String,
    enum: ['all', 'new_users', 'referral_users', 'kyc_verified', 'specific'],
    default: 'all',
  },
  specificUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  // Validity
  status: {
    type: String,
    enum: ['active', 'inactive', 'expired'],
    default: 'active',
  },
  startDate: {
    type: Date,
    default: Date.now,
  },
  endDate: {
    type: Date,
  },
  // Users who used this code
  usedBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    usedAt: {
      type: Date,
      default: Date.now,
    },
    rewardGiven: {
      type: Number,
    },
  }],
  // Created by
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
  },
}, {
  timestamps: true,
});

// Check if code is valid
promoCodeSchema.methods.isValid = function() {
  if (this.status !== 'active') return false;
  const now = new Date();
  if (this.startDate && now < this.startDate) return false;
  if (this.endDate && now > this.endDate) return false;
  if (this.maxUses > 0 && this.usedCount >= this.maxUses) return false;
  return true;
};

// Check if user can use this code
promoCodeSchema.methods.canUserUse = function(userId) {
  if (!this.isValid()) return false;
  
  const userUses = this.usedBy.filter(
    u => u.user.toString() === userId.toString()
  ).length;
  
  if (userUses >= this.maxUsesPerUser) return false;
  
  return true;
};

// Index
promoCodeSchema.index({ code: 1 });
promoCodeSchema.index({ status: 1, startDate: 1, endDate: 1 });

module.exports = mongoose.model('PromoCode', promoCodeSchema);
