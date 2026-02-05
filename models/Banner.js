const mongoose = require('mongoose');

const bannerSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please provide a banner title'],
    trim: true,
    maxlength: 100,
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500,
  },
  image: {
    type: String,
    required: [true, 'Please provide a banner image'],
  },
  link: {
    type: String,
    trim: true,
  },
  linkType: {
    type: String,
    enum: ['internal', 'external', 'none'],
    default: 'none',
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active',
  },
  order: {
    type: Number,
    default: 0,
  },
  views: {
    type: Number,
    default: 0,
  },
  clicks: {
    type: Number,
    default: 0,
  },
  // Target audience
  targetAudience: {
    type: String,
    enum: ['all', 'new_users', 'active_miners', 'kyc_verified', 'kyc_pending'],
    default: 'all',
  },
  // Validity period
  startDate: {
    type: Date,
    default: null,
  },
  endDate: {
    type: Date,
    default: null,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
  },
}, {
  timestamps: true,
});

// Check if banner is currently active
bannerSchema.methods.isCurrentlyActive = function() {
  if (this.status !== 'active') return false;
  const now = new Date();
  if (this.startDate && now < this.startDate) return false;
  if (this.endDate && now > this.endDate) return false;
  return true;
};

// Index for efficient queries
bannerSchema.index({ status: 1, order: 1 });
bannerSchema.index({ startDate: 1, endDate: 1 });

module.exports = mongoose.model('Banner', bannerSchema);
