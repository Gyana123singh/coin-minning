const mongoose = require('mongoose');

const coinPackageSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
  },
  coins: {
    type: Number,
    required: true,
  },
  bonusCoins: {
    type: Number,
    default: 0,
  },
  price: {
    type: Number,
    required: true,
  },
  currency: {
    type: String,
    enum: ['USD', 'INR', 'EUR'],
    default: 'USD',
  },
  // Discount
  originalPrice: {
    type: Number,
  },
  discountPercent: {
    type: Number,
    default: 0,
  },
  // Badge (e.g., "Best Value", "Popular")
  badge: {
    type: String,
  },
  // Is featured
  isFeatured: {
    type: Boolean,
    default: false,
  },
  // Is active
  isActive: {
    type: Boolean,
    default: true,
  },
  // Sort order
  sortOrder: {
    type: Number,
    default: 0,
  },
  // Icon or image
  icon: {
    type: String,
  },
  // Limits
  purchaseLimit: {
    type: Number, // Max purchases per user
    default: 0, // 0 = unlimited
  },
  dailyLimit: {
    type: Number, // Max purchases per day
    default: 0, // 0 = unlimited
  },
  // Valid from/to
  validFrom: {
    type: Date,
  },
  validTo: {
    type: Date,
  },
}, {
  timestamps: true,
});

// Virtual for total coins
coinPackageSchema.virtual('totalCoins').get(function() {
  return this.coins + this.bonusCoins;
});

// Check if package is available
coinPackageSchema.methods.isAvailable = function() {
  if (!this.isActive) return false;
  const now = new Date();
  if (this.validFrom && now < this.validFrom) return false;
  if (this.validTo && now > this.validTo) return false;
  return true;
};

// Index
coinPackageSchema.index({ isActive: 1, sortOrder: 1 });

module.exports = mongoose.model('CoinPackage', coinPackageSchema);
