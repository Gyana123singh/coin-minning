const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a name'],
    trim: true,
    maxlength: 50,
  },
  email: {
    type: String,
    required: [true, 'Please provide an email'],
    unique: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email'],
  },
  password: {
    type: String,
    minlength: 6,
    select: false,
  },
  // Google OAuth
  googleId: {
    type: String,
    unique: true,
    sparse: true,
  },
  authProvider: {
    type: String,
    enum: ['local', 'google'],
    default: 'local',
  },
  phone: {
    type: String,
    trim: true,
  },
  avatar: {
    type: String,
    default: '',
  },
  isEmailVerified: {
    type: Boolean,
    default: false,
  },
  // Referral System
  referralCode: {
    type: String,
    unique: true,
  },
  referredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  referralChain: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  // Referral Stats (nested object for controllers)
  referralStats: {
    totalCount: { type: Number, default: 0 },
    activeCount: { type: Number, default: 0 },
    totalEarned: { type: Number, default: 0 },
    directReferrals: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    indirectReferrals: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    lastPingTime: { type: Date, default: null },
  },
  // Mining Stats (nested object for controllers)
  miningStats: {
    totalCoins: { type: Number, default: 0 },
    totalMined: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
    streak: { type: Number, default: 0 },
    lastMiningTime: { type: Date, default: null },
    currentMiningEndTime: { type: Date, default: null },
  },
  // Ownership Progress (nested object for controllers)
  ownershipProgress: {
    daysActive: { type: Number, default: 0 },
    miningSessions: { type: Number, default: 0 },
    kycInvited: { type: Boolean, default: false },
  },
  // KYC Status
  kycStatus: {
    type: String,
    enum: ['none', 'pending', 'approved', 'rejected'],
    default: 'none',
  },
  // Status (active/suspended for controllers)
  status: {
    type: String,
    enum: ['active', 'suspended', 'deleted'],
    default: 'active',
  },
  lastLogin: {
    type: Date,
    default: Date.now,
  },
  // Daily Check-in
  lastCheckinDate: {
    type: Date,
    default: null,
  },
  checkinStreak: {
    type: Number,
    default: 0,
  },
  // Promo Codes
  usedPromoCodes: [{
    type: String,
  }],
  // Push Notifications
  fcmToken: {
    type: String,
    default: null,
  },
  notificationsEnabled: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

// Generate referral code before saving
userSchema.pre('save', async function(next) {
  if (!this.referralCode) {
    this.referralCode = this.name.substring(0, 3).toUpperCase() + 
      Math.random().toString(36).substring(2, 8).toUpperCase();
  }
  
  if (this.isModified('password') && this.password) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
  next();
});

// Sign JWT and return
userSchema.methods.getSignedJwtToken = function() {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};

// Match user entered password to hashed password in database
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Alias for matchPassword (used by controllers)
userSchema.methods.comparePassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Calculate total mining speed
userSchema.methods.getTotalMiningSpeed = function() {
  return this.baseLevel + this.referralLevel + this.boostLevel;
};

// Check if user can be pinged (12 hours interval)
userSchema.methods.canBePinged = function() {
  if (!this.lastPingedAt) return true;
  const hoursSinceLastPing = (Date.now() - this.lastPingedAt) / (1000 * 60 * 60);
  return hoursSinceLastPing >= 12;
};

module.exports = mongoose.model('User', userSchema);
