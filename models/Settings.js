const mongoose = require("mongoose");

const settingsSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
    },
    value: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    description: {
      type: String,
    },
  },
  {
    timestamps: true,
  },
);

// Default settings with all fields controllers expect
const defaultSettings = {
  // App Settings
  appName: "Mining App",
  appVersion: "1.0.0",
  supportEmail: "support@miningapp.com",
  maintenanceMode: false,

  // Mining Settings
  miningRate: 0.25,
  miningCycleDuration: 24,
  maxCoinsPerCycle: 200,
  boostCost: 50, // Cost in coins to boost mining

  // Referral Settings
  directReferralBonus: 50,
  indirectReferralBonus: 20,
  signupBonus: 100,
  referralBoostPercent: 20,

  // Daily Checkin Bonuses
  dailyCheckinBonuses: [5, 10, 15, 20, 30, 40, 50],

  // Withdrawal Settings
  minWithdrawal: 100,
  coinValue: 0.01,
  withdrawalCooldown: 24, // hours

  // KYC Settings
  miningSessionsRequired: 20,
  ownershipDaysRequired: 30,

  // Transfer Settings
  minTransfer: 10,
  maxTransfer: 10000,
  transferFeePercent: 0,

  // Payment Settings (for coin purchase)
  paymentUpiId: "",
  paymentUpiQrCode: "", // URL to QR code image
  paymentBankName: "",
  paymentAccountNumber: "",
  paymentIfscCode: "",
  paymentAccountHolderName: "",
  coinPricePerDollar: 10, // How many coins per 1 dollar

  // Social Links
  socialLinks: {
    twitter: "https://twitter.com/miningapp",
    telegram: "https://t.me/miningapp",
    instagram: "https://instagram.com/miningapp",
    facebook: "https://facebook.com/miningapp",
    youtube: "https://youtube.com/@miningapp",
    website: "https://miningapp.com",
  },
};

// Static method to get setting by key
settingsSchema.statics.getSetting = async function (key) {
  const setting = await this.findOne({ key });
  if (setting) return setting.value;

  // If not found, create default ONCE
  if (defaultSettings[key] !== undefined) {
    await this.create({
      key,
      value: defaultSettings[key],
      description: "Auto-created default setting",
    });
    return defaultSettings[key];
  }

  return null;
};

// Static method to set setting
settingsSchema.statics.setSetting = async function (
  key,
  value,
  description = "",
) {
  return await this.findOneAndUpdate(
    { key },
    { value, description },
    { upsert: true, new: true },
  );
};

// Static method to get all settings (alias: getSettings for controllers)
settingsSchema.statics.getAllSettings = async function () {
  const settings = await this.find({});
  const result = { ...defaultSettings };
  settings.forEach((s) => {
    result[s.key] = s.value;
  });
  return result;
};

// Alias method used by controllers
settingsSchema.statics.getSettings = async function () {
  return await this.getAllSettings();
};

module.exports = mongoose.model("Settings", settingsSchema);
