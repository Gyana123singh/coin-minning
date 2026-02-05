const mongoose = require('mongoose');

const kycSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  // Personal Information (nested object for controllers)
  personalInfo: {
    fullName: { type: String, required: true },
    dateOfBirth: { type: Date, required: true },
    address: { type: String },
    city: { type: String },
    country: { type: String },
    postalCode: { type: String },
  },
  // Document Information (nested object for controllers)
  document: {
    type: {
      type: String,
      enum: ['passport', 'aadhaar', 'pan', 'driving-license', 'voter-id', 'national-id'],
      required: true,
    },
    number: { type: String },
    frontImage: { type: String, required: true }, // Cloudinary URL
    backImage: { type: String }, // Cloudinary URL
  },
  selfie: {
    type: String, // Cloudinary URL
    required: true,
  },
  // Status
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
  rejectionReason: {
    type: String,
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
  },
  reviewedAt: {
    type: Date,
  },
}, {
  timestamps: true,
});

// Index for queries
kycSchema.index({ user: 1, status: 1 });

module.exports = mongoose.model('KYC', kycSchema);
