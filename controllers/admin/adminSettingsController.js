const Settings = require("../../models/Settings");

// @desc    Get all settings
// @route   GET /api/admin/settings
// @access  Private/Admin
exports.getAllSettings = async (req, res) => {
  try {
    const settings = await Settings.getSettings();

    res.status(200).json({
      success: true,
      settings,
    });
  } catch (error) {
    console.error("Get All Settings Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// @desc    Update app settings
// @route   PUT /api/admin/settings/app
// @access  Private/Admin
exports.updateAppSettings = async (req, res) => {
  try {
    const {
      appName,
      appVersion,
      supportEmail,
      maintenanceMode,
      maintenanceMessage,
    } = req.body;

    if (appName !== undefined) {
      await Settings.setSetting("appName", appName, "Application name");
    }
    if (appVersion !== undefined) {
      await Settings.setSetting(
        "appVersion",
        appVersion,
        "Application version",
      );
    }
    if (supportEmail !== undefined) {
      await Settings.setSetting(
        "supportEmail",
        supportEmail,
        "Support email address",
      );
    }
    if (maintenanceMode !== undefined) {
      await Settings.setSetting(
        "maintenanceMode",
        maintenanceMode,
        "Maintenance mode toggle",
      );
    }
    if (maintenanceMessage !== undefined) {
      await Settings.setSetting(
        "maintenanceMessage",
        maintenanceMessage,
        "Maintenance mode message",
      );
    }

    res.status(200).json({
      success: true,
      message: "App settings updated successfully",
    });
  } catch (error) {
    console.error("Update App Settings Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// @desc    Update social links
// @route   PUT /api/admin/settings/social
// @access  Private/Admin
exports.updateSocialLinks = async (req, res) => {
  try {
    const { socialLinks } = req.body;

    await Settings.setSetting("socialLinks", socialLinks, "Social media links");

    res.status(200).json({
      success: true,
      message: "Social links updated successfully",
    });
  } catch (error) {
    console.error("Update Social Links Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// @desc    Get social links
// @route   GET /api/admin/settings/social
// @access  Private/Admin
exports.getSocialLinks = async (req, res) => {
  try {
    const settings = await Settings.getSettings();

    res.status(200).json({
      success: true,
      socialLinks: settings.socialLinks,
    });
  } catch (error) {
    console.error("Get Social Links Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// @desc    Update withdrawal settings
// @route   PUT /api/admin/settings/withdrawal
// @access  Private/Admin
exports.updateWithdrawalSettings = async (req, res) => {
  try {
    const { minWithdrawal, coinValue, withdrawalCooldown } = req.body;

    if (minWithdrawal !== undefined) {
      await Settings.setSetting(
        "minWithdrawal",
        minWithdrawal,
        "Minimum withdrawal amount",
      );
    }
    if (coinValue !== undefined) {
      await Settings.setSetting(
        "coinValue",
        coinValue,
        "Coin value in currency",
      );
    }
    if (withdrawalCooldown !== undefined) {
      await Settings.setSetting(
        "withdrawalCooldown",
        withdrawalCooldown,
        "Withdrawal cooldown in hours",
      );
    }

    res.status(200).json({
      success: true,
      message: "Withdrawal settings updated successfully",
    });
  } catch (error) {
    console.error("Update Withdrawal Settings Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// @desc    Update KYC settings
// @route   PUT /api/admin/settings/kyc
// @access  Private/Admin
exports.updateKYCSettings = async (req, res) => {
  try {
    const { miningSessionsRequired, ownershipDaysRequired } = req.body;

    if (miningSessionsRequired !== undefined) {
      await Settings.setSetting(
        "miningSessionsRequired",
        miningSessionsRequired,
        "Mining sessions required for KYC",
      );
    }
    if (ownershipDaysRequired !== undefined) {
      await Settings.setSetting(
        "ownershipDaysRequired",
        ownershipDaysRequired,
        "Days required for ownership",
      );
    }

    res.status(200).json({
      success: true,
      message: "KYC settings updated successfully",
    });
  } catch (error) {
    console.error("Update KYC Settings Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// @desc    Update transfer settings
// @route   PUT /api/admin/settings/transfer
// @access  Private/Admin
exports.updateTransferSettings = async (req, res) => {
  try {
    const { minTransfer, maxTransfer, transferFeePercent } = req.body;

    if (minTransfer !== undefined) {
      await Settings.setSetting(
        "minTransfer",
        minTransfer,
        "Minimum transfer amount",
      );
    }
    if (maxTransfer !== undefined) {
      await Settings.setSetting(
        "maxTransfer",
        maxTransfer,
        "Maximum transfer amount",
      );
    }
    if (transferFeePercent !== undefined) {
      await Settings.setSetting(
        "transferFeePercent",
        transferFeePercent,
        "Transfer fee percentage",
      );
    }

    res.status(200).json({
      success: true,
      message: "Transfer settings updated successfully",
    });
  } catch (error) {
    console.error("Update Transfer Settings Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// @desc    Update daily check-in bonuses
// @route   PUT /api/admin/settings/checkin
// @access  Private/Admin
exports.updateCheckinSettings = async (req, res) => {
  try {
    const { dailyCheckinBonuses } = req.body;

    // ✅ VALIDATION: must be an array of exactly 7 values
    if (
      !Array.isArray(dailyCheckinBonuses) ||
      dailyCheckinBonuses.length !== 7
    ) {
      return res.status(400).json({
        success: false,
        message: "Must provide exactly 7 days bonuses",
      });
    }

    // ✅ Optional: ensure all values are valid numbers (and not negative)
    const cleaned = dailyCheckinBonuses.map((v) => Number(v));
    if (cleaned.some((v) => Number.isNaN(v) || v < 0)) {
      return res.status(400).json({
        success: false,
        message: "All bonus values must be valid non-negative numbers",
      });
    }

    await Settings.setSetting(
      "dailyCheckinBonuses",
      cleaned,
      "Daily check-in bonus array",
    );

    res.status(200).json({
      success: true,
      message: "Check-in settings updated successfully",
    });
  } catch (error) {
    console.error("Update Check-in Settings Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// @desc    Toggle maintenance mode
// @route   PUT /api/admin/settings/maintenance
// @access  Private/Admin
exports.toggleMaintenance = async (req, res) => {
  try {
    const { enabled, message } = req.body;

    await Settings.setSetting(
      "maintenanceMode",
      enabled,
      "Maintenance mode toggle",
    );
    if (message) {
      await Settings.setSetting(
        "maintenanceMessage",
        message,
        "Maintenance mode message",
      );
    }

    res.status(200).json({
      success: true,
      message: `Maintenance mode ${enabled ? "enabled" : "disabled"}`,
    });
  } catch (error) {
    console.error("Toggle Maintenance Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// @desc    Bulk update settings
// @route   PUT /api/admin/settings/bulk
// @access  Private/Admin
exports.bulkUpdateSettings = async (req, res) => {
  try {
    const { settings } = req.body;

    if (!settings || typeof settings !== "object") {
      return res.status(400).json({
        success: false,
        message: "Please provide settings object",
      });
    }

    // Update each setting
    for (const [key, value] of Object.entries(settings)) {
      await Settings.setSetting(key, value);
    }

    res.status(200).json({
      success: true,
      message: "Settings updated successfully",
    });
  } catch (error) {
    console.error("Bulk Update Settings Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
