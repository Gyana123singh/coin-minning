const User = require("../models/User");
const Settings = require("../models/Settings");
const Notification = require("../models/Notification");
const Transaction = require("../models/Transaction");
const Wallet = require("../models/Wallet");
const {
  sanitizeUser,
  calculateOwnershipProgress,
  getUserTier,
  parsePagination,
} = require("../utils/helpers");

// @desc    Get user profile
// @route   GET /api/user/profile
// @access  Private
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate(
      "referredBy",
      "name email referralCode",
    );

    const settings = await Settings.getSettings();
    const totalUsers = await User.countDocuments();

    const ownershipProgress = calculateOwnershipProgress(user);
    const userTier = getUserTier(totalUsers);

    res.status(200).json({
      success: true,
      user: sanitizeUser(user),
      ownershipProgress,
      userTier,
      appSettings: {
        miningRate: settings.miningRate,
        miningCycleDuration: settings.miningCycleDuration,
        directReferralBonus: settings.directReferralBonus,
        indirectReferralBonus: settings.indirectReferralBonus,
      },
    });
  } catch (error) {
    console.error("Get Profile Error:", error);
    res.status(500).json({ success: false, message: "Failed to get profile" });
  }
};

// @desc    Update user profile
// @route   PUT /api/user/profile
// @access  Private
const updateProfile = async (req, res) => {
  try {
    const { name, phone } = req.body;

    const updateData = {};
    if (name) updateData.name = name;
    if (phone) updateData.phone = phone;

    const user = await User.findByIdAndUpdate(req.user._id, updateData, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error("Update Profile Error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to update profile" });
  }
};

// @desc    Upload avatar
// @route   POST /api/user/avatar
// @access  Private
const uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "Please upload an image" });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { avatar: req.file.path },
      { new: true },
    );

    res.status(200).json({
      success: true,
      message: "Avatar uploaded successfully",
      avatar: user.avatar,
    });
  } catch (error) {
    console.error("Upload Avatar Error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to upload avatar" });
  }
};

// @desc    Change password
// @route   PUT /api/user/password
// @access  Private
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Current and new password are required",
      });
    }

    const user = await User.findById(req.user._id).select("+password");

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res
        .status(401)
        .json({ success: false, message: "Current password is incorrect" });
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("Change Password Error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to change password" });
  }
};

// @desc    Get user activity/dashboard stats
// @route   GET /api/user/activity
// @access  Private
const getActivity = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const settings = await Settings.getSettings();
    const totalUsers = await User.countDocuments();

    // Calculate rates
    const baseRate = settings.miningRate || 0.25;
    const activeReferrals = user.referralStats?.activeCount || 0;
    const referralBoost = Math.min(activeReferrals * 0.2, 1.0); // Max 100% boost
    const levelBoost = ((user.miningStats?.level || 1) - 1) * 0.05;

    const referralRate = baseRate * referralBoost;
    const boostRate = baseRate * levelBoost;
    const totalRate = baseRate + referralRate + boostRate;

    // Check if mining is active
    let timeRemaining = null;
    let isMining = false;

    if (user.miningStats?.currentMiningEndTime) {
      const endTime = new Date(user.miningStats.currentMiningEndTime);
      if (endTime > new Date()) {
        isMining = true;
        const diff = endTime - new Date();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        timeRemaining = {
          hours,
          minutes,
          seconds,
          formatted: `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`,
          endTime: endTime.toISOString(),
        };
      }
    }

    const userTier = getUserTier(totalUsers);

    res.status(200).json({
      success: true,
      activity: {
        totalCoins: user.miningStats?.totalCoins || 0,
        level: user.miningStats?.level || 1,
        activitiesCompleted: user.ownershipProgress?.miningSessions || 0,
        isMining,
        timeRemaining,
        rates: {
          baseRate: Math.round(baseRate * 100) / 100,
          referralRate: Math.round(referralRate * 100) / 100,
          boostRate: Math.round(boostRate * 100) / 100,
          totalRate: Math.round(totalRate * 100) / 100,
        },
        referrals: {
          total: user.referralStats?.totalCount || 0,
          active: user.referralStats?.activeCount || 0,
          inactive:
            (user.referralStats?.totalCount || 0) -
            (user.referralStats?.activeCount || 0),
        },
        tier: userTier,
      },
    });
  } catch (error) {
    console.error("Get Activity Error:", error);
    res.status(500).json({ success: false, message: "Failed to get activity" });
  }
};

// @desc    Get user stats for admin
// @route   GET /api/user/stats
// @access  Private
const getStats = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    res.status(200).json({
      success: true,
      stats: {
        totalCoins: user.miningStats?.totalCoins || 0,
        level: user.miningStats?.level || 1,
        totalMined: user.miningStats?.totalMined || 0,
        miningStreak: user.miningStats?.streak || 0,
        referralStats: user.referralStats,
        ownershipProgress: calculateOwnershipProgress(user),
        memberSince: user.createdAt,
        lastActive: user.lastLogin,
      },
    });
  } catch (error) {
    console.error("Get Stats Error:", error);
    res.status(500).json({ success: false, message: "Failed to get stats" });
  }
};

// @desc    Delete account
// @route   DELETE /api/user/account
// @access  Private
const deleteAccount = async (req, res) => {
  try {
    await User.findByIdAndDelete(req.user._id);

    res.status(200).json({
      success: true,
      message: "Account deleted successfully",
    });
  } catch (error) {
    console.error("Delete Account Error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to delete account" });
  }
};

// @desc    Daily check-in bonus
// @route   POST /api/users/daily-checkin
// @access  Private
const dailyCheckin = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const settings = await Settings.getSettings();

    // Check if already checked in today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (user.lastCheckinDate && new Date(user.lastCheckinDate) >= today) {
      return res.status(400).json({
        success: false,
        message: "You have already checked in today!",
        nextCheckin: new Date(today.getTime() + 24 * 60 * 60 * 1000),
      });
    }

    // Calculate streak
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    let streak = user.checkinStreak || 0;

    if (user.lastCheckinDate && new Date(user.lastCheckinDate) >= yesterday) {
      streak += 1;
    } else {
      streak = 1; // Reset streak
    }

    // Calculate bonus based on streak (cap at day 7)
    // Get bonuses from settings (admin configured)
    const bonuses = settings.dailyCheckinBonuses || [5, 10, 15, 20, 30, 40, 50];

    // Reset cycle after 7 days
    if (streak > bonuses.length) {
      streak = 1;
    }

    // Calculate bonus based on streak
    const bonusCoins = Number(Number(bonuses[streak - 1] || 0).toFixed(4));

    // Update user
    user.miningStats.totalCoins += bonusCoins;
    user.lastCheckinDate = new Date();
    user.checkinStreak = streak;
    await user.save();

    // Update wallet if exists
    let wallet = await Wallet.findOne({ user: req.user._id });
    if (wallet) {
      await wallet.addCoins(bonusCoins, "mining");
    }

    // Create transaction record
    await Transaction.create({
      user: req.user._id,
      type: "bonus",
      amount: bonusCoins,
      coins: bonusCoins,
      currency: "COIN",
      status: "completed",
      description: `Daily check-in bonus (Day ${streak})`,
    });

    // Send notification
    await Notification.create({
      user: req.user._id,
      type: "reward",
      title: "Daily Check-in Bonus! 🎁",
      message: `You earned ${bonusCoins} coins for Day ${streak} check-in!`,
    });

    res.status(200).json({
      success: true,
      message: `Check-in successful! You earned ${bonusCoins} coins.`,
      bonus: {
        coins: bonusCoins,
        day: streak,
        nextDayBonus: Number(
          Number(bonuses[streak % bonuses.length] || 0).toFixed(4),
        ),
      },
      streak,
      totalCoins: user.miningStats.totalCoins,
      nextCheckin: new Date(today.getTime() + 24 * 60 * 60 * 1000),
    });
  } catch (error) {
    console.error("Daily Checkin Error:", error);
    res.status(500).json({ success: false, message: "Failed to check in" });
  }
};

// @desc    Get daily check-in status
// @route   GET /api/users/daily-checkin
// @access  Private
const getCheckinStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const settings = await Settings.getSettings(); // ✅ ADD THIS

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const hasCheckedIn =
      user.lastCheckinDate && new Date(user.lastCheckinDate) >= today;

    // Day bonus array
    const bonuses = settings.dailyCheckinBonuses || [5, 10, 15, 20, 30, 40, 50];

    const currentStreak = user.checkinStreak || 0;

    res.status(200).json({
      success: true,
      checkin: {
        hasCheckedIn,
        streak: currentStreak,
        nextBonus: Number(
          Number(bonuses[currentStreak % bonuses.length] || 0).toFixed(4),
        ),

        lastCheckin: user.lastCheckinDate,
        nextAvailable: hasCheckedIn
          ? new Date(today.getTime() + 24 * 60 * 60 * 1000)
          : new Date(),
        weeklyProgress: Array.from({ length: bonuses.length }, (_, i) => ({
          day: i + 1,
          coins: Number(Number(bonuses[i] || 0).toFixed(4)),

          completed: i < currentStreak,
          current: i === currentStreak,
        })),
      },
    });
  } catch (error) {
    console.error("Get Checkin Status Error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to get check-in status" });
  }
};

// @desc    Get user dashboard data (all in one)
// @route   GET /api/users/dashboard
// @access  Private
const getDashboard = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const settings = await Settings.getSettings();
    const totalUsers = await User.countDocuments();

    // Mining status
    let miningStatus = "idle";
    let timeRemaining = null;

    if (user.miningStats?.currentMiningEndTime) {
      const endTime = new Date(user.miningStats.currentMiningEndTime);
      if (endTime > new Date()) {
        miningStatus = "mining";
        const diff = endTime - new Date();
        timeRemaining = {
          hours: Math.floor(diff / (1000 * 60 * 60)),
          minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((diff % (1000 * 60)) / 1000),
        };
      } else {
        miningStatus = "ready_to_claim";
      }
    }

    // Calculate rates
    const baseRate = settings.miningRate || 0.25;
    const activeReferrals = user.referralStats?.activeCount || 0;
    const referralBoost = Math.min(activeReferrals * 0.2, 1.0);
    const levelBoost = ((user.miningStats?.level || 1) - 1) * 0.05;
    const totalRate = baseRate * (1 + referralBoost + levelBoost);

    // Check-in status
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const hasCheckedIn =
      user.lastCheckinDate && new Date(user.lastCheckinDate) >= today;

    // Get or create wallet
    let wallet = await Wallet.findOne({ user: req.user._id });
    if (!wallet) {
      wallet = await Wallet.create({
        user: req.user._id,
        miningBalance: user.miningStats?.totalCoins || 0,
        totalMined: user.miningStats?.totalMined || 0,
      });
    }

    const coinValue = settings.coinValue || 0.01;

    res.status(200).json({
      success: true,
      dashboard: {
        user: {
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          level: user.miningStats?.level || 1,
          totalCoins: user.miningStats?.totalCoins || 0,
          totalMined: user.miningStats?.totalMined || 0,
          streak: user.miningStats?.streak || 0,
          kycStatus: user.kycStatus,
        },
        mining: {
          status: miningStatus,
          timeRemaining,
          rates: {
            base: baseRate,
            referral: baseRate * referralBoost,
            level: baseRate * levelBoost,
            total: totalRate,
          },
          expectedCoins: totalRate * (settings.miningCycleDuration || 24),
        },
        referrals: {
          total: user.referralStats?.totalCount || 0,
          active: user.referralStats?.activeCount || 0,
          code: user.referralCode,
          totalEarned: user.referralStats?.totalEarned || 0,
        },
        // ========== DUAL WALLET SYSTEM ==========
        wallets: {
          // Mining Wallet - Coins from mining activities
          mining: {
            balance: wallet.miningBalance,
            available: wallet.availableMiningCoins,
            locked: wallet.miningLockedCoins,
            totalMined: wallet.totalMined,
            fiatValue: wallet.miningBalance * coinValue,
          },
          // Purchase Wallet - Coins bought with money
          purchase: {
            balance: wallet.purchaseBalance,
            available: wallet.availablePurchaseCoins,
            locked: wallet.purchaseLockedCoins,
            totalPurchased: wallet.totalPurchased,
            fiatValue: wallet.purchaseBalance * coinValue,
          },
          // Referral Wallet - Coins from referral bonuses
          referral: {
            balance: wallet.referralBalance,
            totalEarned: wallet.totalReferralEarned,
            fiatValue: wallet.referralBalance * coinValue,
          },
          // Combined totals
          total: {
            balance:
              wallet.miningBalance +
              wallet.purchaseBalance +
              wallet.referralBalance,
            available: wallet.availableCoins,
            locked: wallet.lockedCoins,
            fiatValue:
              (wallet.miningBalance +
                wallet.purchaseBalance +
                wallet.referralBalance) *
              coinValue,
          },
          coinValue: coinValue,
          currency: wallet.currency,
        },
        // Legacy wallet field (for backward compatibility)
        wallet: {
          balance:
            wallet.miningBalance +
            wallet.purchaseBalance +
            wallet.referralBalance,
          available: wallet.availableCoins,
          locked: wallet.lockedCoins,
        },
        checkin: {
          hasCheckedIn,
          streak: user.checkinStreak || 0,
        },
        progress: calculateOwnershipProgress(user),
        tier: getUserTier(totalUsers),
      },
    });
  } catch (error) {
    console.error("Get Dashboard Error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to get dashboard" });
  }
};

// @desc    Redeem promo code
// @route   POST /api/users/redeem-code
// @access  Private
const redeemPromoCode = async (req, res) => {
  try {
    const { code } = req.body;
    const user = await User.findById(req.user._id);

    if (!code) {
      return res
        .status(400)
        .json({ success: false, message: "Please enter a code" });
    }

    // This would be connected to a PromoCode model in production
    // For now, just simulate some codes
    const validCodes = {
      WELCOME100: { coins: 100, description: "Welcome bonus" },
      BONUS50: { coins: 50, description: "Bonus code" },
    };

    const promo = validCodes[code.toUpperCase()];

    if (!promo) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid or expired code" });
    }

    // Check if already used (would check against user's usedCodes array)
    if (user.usedPromoCodes?.includes(code.toUpperCase())) {
      return res
        .status(400)
        .json({ success: false, message: "Code already used" });
    }

    // Add coins
    user.miningStats.totalCoins += promo.coins;
    user.usedPromoCodes = user.usedPromoCodes || [];
    user.usedPromoCodes.push(code.toUpperCase());
    await user.save();

    // Create transaction
    await Transaction.create({
      user: req.user._id,
      type: "bonus",
      amount: promo.coins,
      coins: promo.coins,
      currency: "COIN",
      status: "completed",
      description: `Promo code: ${code.toUpperCase()} - ${promo.description}`,
    });

    res.status(200).json({
      success: true,
      message: `Code redeemed! You received ${promo.coins} coins.`,
      coins: promo.coins,
      totalCoins: user.miningStats.totalCoins,
    });
  } catch (error) {
    console.error("Redeem Code Error:", error);
    res.status(500).json({ success: false, message: "Failed to redeem code" });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  uploadAvatar,
  changePassword,
  getActivity,
  getStats,
  deleteAccount,
  dailyCheckin,
  getCheckinStatus,
  getDashboard,
  redeemPromoCode,
};
