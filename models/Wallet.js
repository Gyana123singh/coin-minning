const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  
  // ========== MINING WALLET ==========
  // Coins earned from mining activities
  miningBalance: {
    type: Number,
    default: 0,
  },
  // Locked mining coins (pending withdrawal or transfer)
  miningLockedCoins: {
    type: Number,
    default: 0,
  },
  // Total mined (lifetime)
  totalMined: {
    type: Number,
    default: 0,
  },
  
  // ========== PURCHASE WALLET ==========
  // Coins bought with real money
  purchaseBalance: {
    type: Number,
    default: 0,
  },
  // Locked purchase coins (pending withdrawal or transfer)
  purchaseLockedCoins: {
    type: Number,
    default: 0,
  },
  // Total purchased (lifetime)
  totalPurchased: {
    type: Number,
    default: 0,
  },
  
  // ========== COMBINED STATS ==========
  // Legacy field - kept for backward compatibility (sum of both wallets)
  coinBalance: {
    type: Number,
    default: 0,
  },
  // Legacy locked coins (sum of both)
  lockedCoins: {
    type: Number,
    default: 0,
  },
  // Fiat balance (for purchases/withdrawals)
  fiatBalance: {
    type: Number,
    default: 0,
  },
  currency: {
    type: String,
    enum: ['USD', 'INR', 'EUR'],
    default: 'USD',
  },
  // Total earned (lifetime - all sources)
  totalEarned: {
    type: Number,
    default: 0,
  },
  // Total withdrawn (lifetime)
  totalWithdrawn: {
    type: Number,
    default: 0,
  },
  
  // ========== REFERRAL BONUS ==========
  // Coins from referral bonuses
  referralBalance: {
    type: Number,
    default: 0,
  },
  totalReferralEarned: {
    type: Number,
    default: 0,
  },
  
  // ========== WITHDRAWAL SETTINGS ==========
  withdrawalAddress: {
    upiId: String,
    bankAccount: String,
    bankIfsc: String,
    bankName: String,
    accountHolderName: String,
    cryptoAddress: String,
    cryptoNetwork: String,
  },
  // Minimum withdrawal
  minWithdrawal: {
    type: Number,
    default: 100,
  },
  // Last withdrawal
  lastWithdrawalAt: {
    type: Date,
  },
  // Withdrawal cooldown (hours)
  withdrawalCooldown: {
    type: Number,
    default: 24,
  },
  // Status
  status: {
    type: String,
    enum: ['active', 'frozen', 'suspended'],
    default: 'active',
  },
  frozenReason: {
    type: String,
  },
}, {
  timestamps: true,
});

// ========== VIRTUAL FIELDS ==========

// Total coin balance (sum of all wallets)
walletSchema.virtual('totalBalance').get(function() {
  return this.miningBalance + this.purchaseBalance + this.referralBalance;
});

// Available mining coins
walletSchema.virtual('availableMiningCoins').get(function() {
  return this.miningBalance - this.miningLockedCoins;
});

// Available purchase coins
walletSchema.virtual('availablePurchaseCoins').get(function() {
  return this.purchaseBalance - this.purchaseLockedCoins;
});

// Total available coins (legacy compatible)
walletSchema.virtual('availableCoins').get(function() {
  return this.totalBalance - this.lockedCoins;
});

// ========== MINING WALLET METHODS ==========

// Add coins to mining wallet
walletSchema.methods.addMiningCoins = async function(amount) {
  this.miningBalance += amount;
  this.totalMined += amount;
  this.coinBalance = this.miningBalance + this.purchaseBalance + this.referralBalance;
  this.totalEarned += amount;
  await this.save();
  return this;
};

// Deduct coins from mining wallet
walletSchema.methods.deductMiningCoins = async function(amount) {
  if (this.availableMiningCoins < amount) {
    throw new Error('Insufficient mining balance');
  }
  this.miningBalance -= amount;
  this.coinBalance = this.miningBalance + this.purchaseBalance + this.referralBalance;
  await this.save();
  return this;
};

// Lock mining coins
walletSchema.methods.lockMiningCoins = async function(amount) {
  if (this.availableMiningCoins < amount) {
    throw new Error('Insufficient mining balance');
  }
  this.miningLockedCoins += amount;
  this.lockedCoins = this.miningLockedCoins + this.purchaseLockedCoins;
  await this.save();
  return this;
};

// Unlock mining coins
walletSchema.methods.unlockMiningCoins = async function(amount) {
  this.miningLockedCoins = Math.max(0, this.miningLockedCoins - amount);
  this.lockedCoins = this.miningLockedCoins + this.purchaseLockedCoins;
  await this.save();
  return this;
};

// ========== PURCHASE WALLET METHODS ==========

// Add coins to purchase wallet
walletSchema.methods.addPurchaseCoins = async function(amount) {
  this.purchaseBalance += amount;
  this.totalPurchased += amount;
  this.coinBalance = this.miningBalance + this.purchaseBalance + this.referralBalance;
  this.totalEarned += amount;
  await this.save();
  return this;
};

// Deduct coins from purchase wallet
walletSchema.methods.deductPurchaseCoins = async function(amount) {
  if (this.availablePurchaseCoins < amount) {
    throw new Error('Insufficient purchase balance');
  }
  this.purchaseBalance -= amount;
  this.coinBalance = this.miningBalance + this.purchaseBalance + this.referralBalance;
  await this.save();
  return this;
};

// Lock purchase coins
walletSchema.methods.lockPurchaseCoins = async function(amount) {
  if (this.availablePurchaseCoins < amount) {
    throw new Error('Insufficient purchase balance');
  }
  this.purchaseLockedCoins += amount;
  this.lockedCoins = this.miningLockedCoins + this.purchaseLockedCoins;
  await this.save();
  return this;
};

// Unlock purchase coins
walletSchema.methods.unlockPurchaseCoins = async function(amount) {
  this.purchaseLockedCoins = Math.max(0, this.purchaseLockedCoins - amount);
  this.lockedCoins = this.miningLockedCoins + this.purchaseLockedCoins;
  await this.save();
  return this;
};

// ========== REFERRAL WALLET METHODS ==========

// Add referral bonus coins
walletSchema.methods.addReferralCoins = async function(amount) {
  this.referralBalance += amount;
  this.totalReferralEarned += amount;
  this.coinBalance = this.miningBalance + this.purchaseBalance + this.referralBalance;
  this.totalEarned += amount;
  await this.save();
  return this;
};

// ========== LEGACY METHODS (backward compatible) ==========

// Method to add coins (legacy - defaults to mining)
walletSchema.methods.addCoins = async function(amount, source = 'mining') {
  if (source === 'purchase') {
    return this.addPurchaseCoins(amount);
  } else if (source === 'referral') {
    return this.addReferralCoins(amount);
  }
  return this.addMiningCoins(amount);
};

// Method to deduct coins (from total - tries purchase first, then mining)
walletSchema.methods.deductCoins = async function(amount, walletType = 'auto') {
  if (walletType === 'mining') {
    return this.deductMiningCoins(amount);
  } else if (walletType === 'purchase') {
    return this.deductPurchaseCoins(amount);
  }
  
  // Auto mode: deduct from purchase first, then mining
  let remaining = amount;
  
  if (this.availablePurchaseCoins >= remaining) {
    return this.deductPurchaseCoins(remaining);
  } else if (this.availablePurchaseCoins > 0) {
    const fromPurchase = this.availablePurchaseCoins;
    remaining -= fromPurchase;
    this.purchaseBalance -= fromPurchase;
  }
  
  if (remaining > 0 && this.availableMiningCoins >= remaining) {
    this.miningBalance -= remaining;
  } else if (remaining > 0) {
    throw new Error('Insufficient balance');
  }
  
  this.coinBalance = this.miningBalance + this.purchaseBalance + this.referralBalance;
  await this.save();
  return this;
};

// Method to lock coins (legacy)
walletSchema.methods.lockCoins = async function(amount, walletType = 'auto') {
  if (walletType === 'mining') {
    return this.lockMiningCoins(amount);
  } else if (walletType === 'purchase') {
    return this.lockPurchaseCoins(amount);
  }
  
  // Auto mode: lock from purchase first, then mining
  let remaining = amount;
  
  if (this.availablePurchaseCoins >= remaining) {
    this.purchaseLockedCoins += remaining;
  } else {
    const fromPurchase = this.availablePurchaseCoins;
    this.purchaseLockedCoins += fromPurchase;
    remaining -= fromPurchase;
    
    if (this.availableMiningCoins >= remaining) {
      this.miningLockedCoins += remaining;
    } else {
      throw new Error('Insufficient balance');
    }
  }
  
  this.lockedCoins = this.miningLockedCoins + this.purchaseLockedCoins;
  await this.save();
  return this;
};

// Method to unlock coins
walletSchema.methods.unlockCoins = async function(amount) {
  // Unlock proportionally
  const totalLocked = this.miningLockedCoins + this.purchaseLockedCoins;
  if (totalLocked === 0) return this;
  
  const miningRatio = this.miningLockedCoins / totalLocked;
  const purchaseRatio = this.purchaseLockedCoins / totalLocked;
  
  this.miningLockedCoins = Math.max(0, this.miningLockedCoins - (amount * miningRatio));
  this.purchaseLockedCoins = Math.max(0, this.purchaseLockedCoins - (amount * purchaseRatio));
  this.lockedCoins = this.miningLockedCoins + this.purchaseLockedCoins;
  
  await this.save();
  return this;
};

// Method to check if can withdraw
walletSchema.methods.canWithdraw = function(walletType = 'all') {
  if (this.status !== 'active') return { canWithdraw: false, reason: 'Wallet is ' + this.status };
  
  let availableBalance;
  if (walletType === 'mining') {
    availableBalance = this.availableMiningCoins;
  } else if (walletType === 'purchase') {
    availableBalance = this.availablePurchaseCoins;
  } else {
    availableBalance = this.availableCoins;
  }
  
  if (availableBalance < this.minWithdrawal) {
    return { canWithdraw: false, reason: `Minimum withdrawal is ${this.minWithdrawal} coins` };
  }
  if (this.lastWithdrawalAt) {
    const hoursSinceLastWithdrawal = (Date.now() - new Date(this.lastWithdrawalAt)) / (1000 * 60 * 60);
    if (hoursSinceLastWithdrawal < this.withdrawalCooldown) {
      const hoursRemaining = Math.ceil(this.withdrawalCooldown - hoursSinceLastWithdrawal);
      return { canWithdraw: false, reason: `Please wait ${hoursRemaining} hours before next withdrawal` };
    }
  }
  return { canWithdraw: true };
};

// Sync total balance (recalculate)
walletSchema.methods.syncTotalBalance = async function() {
  this.coinBalance = this.miningBalance + this.purchaseBalance + this.referralBalance;
  this.lockedCoins = this.miningLockedCoins + this.purchaseLockedCoins;
  await this.save();
  return this;
};

// Note: user field already has unique: true which creates an index
// No need for explicit walletSchema.index({ user: 1 })

module.exports = mongoose.model('Wallet', walletSchema);
