const User = require("../models/User");
const Referral = require("../models/Referral");
const Notification = require("../models/Notification");
const Settings = require("../models/Settings");
const {
  isUserActive,
  parsePagination,
  sanitizeUser,
} = require("../utils/helpers");

// @desc    Get referral stats and list
// @route   GET /api/referrals
// @access  Private
const getReferrals = async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const { type } = req.query; // 'direct', 'indirect', 'all'

    const user = await User.findById(req.user._id);

    // Build query
    let query = { referrer: req.user._id };
    if (type && type !== "all") {
      query.type = type;
    }

    // Get referrals
    const referrals = await Referral.find(query)
      .populate(
        "referred",
        "name email avatar createdAt miningStats.lastMiningTime miningStats.currentMiningEndTime miningStats.totalMined miningStats.lastPingedBy miningStats.lastPingedByName miningStats.lastPingedAt",
      )
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Referral.countDocuments(query);

    const now = new Date();
    const isMiningNow = (referredUser) => {
      if (!referredUser || !referredUser.miningStats?.currentMiningEndTime) return false;
      return new Date(referredUser.miningStats.currentMiningEndTime) > now;
    };

    const MiningSession = require("../models/MiningSession");

    // Process referrals to add active status
    const processedReferrals = [];
    for (const ref of referrals) {
      const isActive = ref.referred ? isMiningNow(ref.referred) : false;
      let miningRate = 0;

      if (isActive && ref.referred) {
        const activeSession = await MiningSession.findOne({
          user: ref.referred._id,
          status: "active",
        });
        miningRate = activeSession ? activeSession.totalRate : 0.25;
      }

      processedReferrals.push({
        id: ref._id,
        user: ref.referred
          ? {
              id: ref.referred._id,
              name: ref.referred.name,
              email: ref.referred.email,
              avatar: ref.referred.avatar,
              joinedAt: ref.referred.createdAt,
              miningStats: ref.referred.miningStats,
            }
          : null,
        type: ref.type,
        coinsEarned: ref.coinsEarned || 0,
        isActive,
        miningRate,
        totalMined: ref.referred?.miningStats?.totalMined || 0,
        status: isActive ? "Mining Active" : "Idle",
        lastPingedBy: ref.referred?.miningStats?.lastPingedBy || null,
        lastPingedByName: ref.referred?.miningStats?.lastPingedByName || "",
        lastPingedAt: ref.referred?.miningStats?.lastPingedAt || null,
        createdAt: ref.createdAt,
      });
    }

    // Get counts
    const directCount = await Referral.countDocuments({
      referrer: req.user._id,
      type: "direct",
    });
    const indirectCount = await Referral.countDocuments({
      referrer: req.user._id,
      type: "indirect",
    });

    // Calculate active count and real-time coins produced
    const allDirectReferrals = await Referral.find({
      referrer: req.user._id,
      type: "direct",
    }).populate("referred");

    let activeCount = 0;
    let activeCoinsProduced = 0;
    let inactiveCoinsProduced = 0;

    allDirectReferrals.forEach((ref) => {
      if (ref.referred) {
        const produced = ref.referred.miningStats?.totalMined || 0;
        if (isMiningNow(ref.referred)) {
          activeCount++;
          activeCoinsProduced += produced;
        } else {
          inactiveCoinsProduced += produced;
        }
      }
    });

    const inactiveCount = directCount - activeCount;

    const totalEarnedAgg = await Referral.aggregate([
      { $match: { referrer: req.user._id } },
      { $group: { _id: null, total: { $sum: "$coinsEarned" } } },
    ]);

    const totalEarned = totalEarnedAgg[0]?.total || 0;

    res.status(200).json({
      success: true,
      referrals: processedReferrals,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      stats: {
        totalReferrals: directCount + indirectCount,
        directReferrals: directCount,
        indirectReferrals: indirectCount,
        activeCount,
        inactiveCount,
        activeCoinsProduced: parseFloat(activeCoinsProduced.toFixed(2)),
        inactiveCoinsProduced: parseFloat(inactiveCoinsProduced.toFixed(2)),
        totalEarned: totalEarned,
      },
      referralCode: user.referralCode,
    });
  } catch (error) {
    console.error("Get Referrals Error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to get referrals" });
  }
};

// @desc    Get referral code and share link
// @route   GET /api/referrals/share
// @access  Private
const getShareLink = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    const shareLink =
      process.env.APP_SHARE_LINK ||
      "https://play.google.com/store/apps/details?id=com.olaroapp.app";

    res.status(200).json({
      success: true,
      referralCode: user.referralCode,
      shareLink,
      shareMessage: `Join Olaro App and start earning coins! Use my referral code: ${user.referralCode} to get bonus coins. Download app: ${shareLink}`,
    });
  } catch (error) {
    console.error("Get Share Link Error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to get share link" });
  }
};

// @desc    Ping inactive referrals
// @route   POST /api/referrals/ping
// @access  Private
const pingInactiveReferrals = async (req, res) => {
  try {
    const { targetUserId } = req.body;
    const user = await User.findById(req.user._id);

    if (!targetUserId) {
      return res.status(400).json({
        success: false,
        message: "Target user ID is required",
      });
    }

    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // 1. Verify target user is inactive
    const isMiningActive = targetUser.miningStats?.currentMiningEndTime && new Date(targetUser.miningStats.currentMiningEndTime) > new Date();
    if (isMiningActive) {
      return res.status(400).json({
        success: false,
        message: `${targetUser.name} is currently actively mining.`,
      });
    }

    // 2. Verify requesting user is an ancestor of the target user
    const isDirectReferrer = targetUser.referredBy && targetUser.referredBy.toString() === req.user._id.toString();
    const isChainReferrer = targetUser.referralChain && targetUser.referralChain.some(id => id.toString() === req.user._id.toString());

    // Traversal fallback for legacy users
    let isLegacyReferrer = false;
    if (!isDirectReferrer && !isChainReferrer) {
      let current = targetUser;
      while (current && current.referredBy) {
        if (current.referredBy.toString() === req.user._id.toString()) {
          isLegacyReferrer = true;
          break;
        }
        current = await User.findById(current.referredBy);
      }
    }

    if (!isDirectReferrer && !isChainReferrer && !isLegacyReferrer) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to ping this user. Pings are restricted to the referral network.",
      });
    }

    // 3. Validation Lock: check if anyone has already pinged during this inactive period
    if (targetUser.miningStats?.lastPingedBy) {
      const pingedByName = targetUser.miningStats.lastPingedByName || "Another user";
      return res.status(400).json({
        success: false,
        message: `${pingedByName} has already sent a notification to ${targetUser.name}.`,
      });
    }

    // 4. Lock and Send Notification
    targetUser.miningStats.lastPingedBy = req.user._id;
    targetUser.miningStats.lastPingedByName = user.name;
    targetUser.miningStats.lastPingedAt = new Date();
    await targetUser.save();

    // Create Mongoose Notification
    await Notification.create({
      user: targetUser._id,
      type: "reminder",
      title: "Start Mining! ⛏️",
      message: `${user.name} is reminding you to start mining and earn OLR coins!`,
    });

    res.status(200).json({
      success: true,
      message: `Notification successfully sent to ${targetUser.name}.`,
      lastPingedByName: user.name,
      lastPingedAt: targetUser.miningStats.lastPingedAt,
    });
  } catch (error) {
    console.error("Ping Inactive Error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to ping inactive referral" });
  }
};

// @desc    Get referral earnings history
// @route   GET /api/referrals/earnings
// @access  Private
const getReferralEarnings = async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);

    const earnings = await Referral.find({ referrer: req.user._id })
      .populate("referred", "name email avatar")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Referral.countDocuments({ referrer: req.user._id });

    // Calculate total earnings
    const totalEarnedAgg = await Referral.aggregate([
      { $match: { referrer: req.user._id } },
      { $group: { _id: null, total: { $sum: "$coinsEarned" } } },
    ]);

    const totalEarned = totalEarnedAgg[0]?.total || 0;

    res.status(200).json({
      success: true,
      earnings: earnings.map((e) => ({
        id: e._id,
        user: e.referred
          ? {
              name: e.referred.name,
              email: e.referred.email,
              avatar: e.referred.avatar,
            }
          : null,
        type: e.type,
        coinsEarned: e.coinsEarned,
        date: e.createdAt,
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      totalEarned: totalEarned,
    });
  } catch (error) {
    console.error("Get Referral Earnings Error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to get referral earnings" });
  }
};

// @desc    Check if referral code is valid
// @route   GET /api/referrals/validate/:code
// @access  Public
const validateReferralCode = async (req, res) => {
  try {
    const { code } = req.params;

    const user = await User.findOne({ referralCode: code.toUpperCase() });

    if (!user) {
      return res.status(404).json({
        success: false,
        valid: false,
        message: "Invalid referral code",
      });
    }

    res.status(200).json({
      success: true,
      valid: true,
      referrer: {
        name: user.name,
      },
    });
  } catch (error) {
    console.error("Validate Referral Code Error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to validate code" });
  }
};
// @route GET /api/referrals/public-settings
// @access Public
const getPublicReferralSettings = async (req, res) => {
  const settings = await Settings.getSettings();
  res.json({
    success: true,
    directReferralBonus: settings.directReferralBonus,
    indirectReferralBonus: settings.indirectReferralBonus,
    signupBonus: settings.signupBonus,
  });
};

module.exports = {
  getReferrals,
  getShareLink,
  pingInactiveReferrals,
  getReferralEarnings,
  validateReferralCode,
  getPublicReferralSettings,
};
