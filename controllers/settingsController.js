const Settings = require('../models/Settings');

// @desc    Get app settings (public)
// @route   GET /api/settings
// @access  Public
const getSettings = async (req, res) => {
  try {
    const settings = await Settings.getSettings();

    // Return only public settings
    res.status(200).json({
      success: true,
      settings: {
        appName: settings.appName,
        appVersion: settings.appVersion,
        miningRate: settings.miningRate,
        miningCycleDuration: settings.miningCycleDuration,
        directReferralBonus: settings.directReferralBonus,
        indirectReferralBonus: settings.indirectReferralBonus,
        signupBonus: settings.signupBonus,
        maintenanceMode: settings.maintenanceMode,
        socialLinks: settings.socialLinks,
        minWithdrawal: settings.minWithdrawal,
        coinValue: settings.coinValue,
      },
    });
  } catch (error) {
    console.error('Get Settings Error:', error);
    res.status(500).json({ success: false, message: 'Failed to get settings' });
  }
};

// @desc    Get social links only
// @route   GET /api/settings/social
// @access  Public
const getSocialLinks = async (req, res) => {
  try {
    const settings = await Settings.getSettings();

    res.status(200).json({
      success: true,
      socialLinks: settings.socialLinks,
    });
  } catch (error) {
    console.error('Get Social Links Error:', error);
    res.status(500).json({ success: false, message: 'Failed to get social links' });
  }
};

// @desc    Check maintenance mode
// @route   GET /api/settings/maintenance
// @access  Public
const checkMaintenance = async (req, res) => {
  try {
    const settings = await Settings.getSettings();

    res.status(200).json({
      success: true,
      maintenanceMode: settings.maintenanceMode,
      message: settings.maintenanceMode 
        ? 'The app is currently under maintenance. Please try again later.' 
        : null,
    });
  } catch (error) {
    console.error('Check Maintenance Error:', error);
    res.status(500).json({ success: false, message: 'Failed to check maintenance status' });
  }
};

module.exports = {
  getSettings,
  getSocialLinks,
  checkMaintenance,
};
