const Referral = require("../../models/Referral");
const User = require("../../models/User");
const Settings = require("../../models/Settings");

// @desc    Get all referrals
// @route   GET /api/admin/referrals
// @access  Private/Admin
exports.getAllReferrals = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      type,
      status,
      search,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    // Build query
    const query = {};

    if (type && type !== "all") {
      query.type = type;
    }

    if (status && status !== "all") {
      query.status = status;
    }

    // Build sort
    const sort = {};
    sort[sortBy] = sortOrder === "asc" ? 1 : -1;

    // Execute query with pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const referrals = await Referral.find(query)
      .populate("referrer", "name email avatar referralCode")
      .populate("referred", "name email avatar status")
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Referral.countDocuments(query);

    res.status(200).json({
      success: true,
      referrals,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total,
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    console.error("Get All Referrals Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// @desc    Get referral statistics
// @route   GET /api/admin/referrals/stats
// @access  Private/Admin
exports.getReferralStats = async (req, res) => {
  try {
    const totalReferrals = await Referral.countDocuments();
    const directReferrals = await Referral.countDocuments({ type: "direct" });
    const indirectReferrals = await Referral.countDocuments({
      type: "indirect",
    });
    const activeReferrals = await Referral.countDocuments({ status: "active" });
    const inactiveReferrals = await Referral.countDocuments({
      status: "inactive",
    });

    // Total bonus distributed - using coinsEarned field
    const bonusResult = await Referral.aggregate([
      { $group: { _id: null, total: { $sum: "$coinsEarned" } } },
    ]);
    const totalBonusDistributed = bonusResult[0]?.total || 0;

    // This week's referrals
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const thisWeekReferrals = await Referral.countDocuments({
      createdAt: { $gte: weekAgo },
    });

    // Top referrers - using coinsEarned field
    const topReferrers = await Referral.aggregate([
      { $match: { type: "direct" } },
      {
        $group: {
          _id: "$referrer",
          count: { $sum: 1 },
          totalBonus: { $sum: "$coinsEarned" },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "userInfo",
        },
      },
      { $unwind: "$userInfo" },
      {
        $project: {
          _id: 1,
          count: 1,
          totalBonus: 1,
          name: "$userInfo.name",
          email: "$userInfo.email",
        },
      },
    ]);

    res.status(200).json({
      success: true,
      stats: {
        total: totalReferrals,
        direct: directReferrals,
        indirect: indirectReferrals,
        active: activeReferrals,
        inactive: inactiveReferrals,
        totalBonusDistributed,
        thisWeek: thisWeekReferrals,
        topReferrers,
      },
    });
  } catch (error) {
    console.error("Referral Stats Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// @desc    Get referral settings
// @route   GET /api/admin/referrals/settings
// @access  Private/Admin
exports.getReferralSettings = async (req, res) => {
  try {
    const settings = await Settings.getSettings();

    res.status(200).json({
      success: true,
      settings: {
        directReferralBonus: settings.directReferralBonus,
        indirectReferralBonus: settings.indirectReferralBonus,
        signupBonus: settings.signupBonus,
        referralBoostPercent: settings.referralBoostPercent,
      },
    });
  } catch (error) {
    console.error("Get Referral Settings Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// @desc    Update referral settings
// @route   PUT /api/admin/referrals/settings
// @access  Private/Admin
exports.updateReferralSettings = async (req, res) => {
  try {
    const {
      directReferralBonus,
      indirectReferralBonus,
      signupBonus,
      referralBoostPercent,
    } = req.body;

    if (directReferralBonus !== undefined) {
      await Settings.setSetting(
        "directReferralBonus",
        directReferralBonus,
        "Direct referral bonus coins",
      );
    }
    if (indirectReferralBonus !== undefined) {
      await Settings.setSetting(
        "indirectReferralBonus",
        indirectReferralBonus,
        "Indirect referral bonus coins",
      );
    }
    if (signupBonus !== undefined) {
      await Settings.setSetting(
        "signupBonus",
        signupBonus,
        "Signup bonus coins",
      );
    }
    if (referralBoostPercent !== undefined) {
      await Settings.setSetting(
        "referralBoostPercent",
        referralBoostPercent,
        "Referral mining boost percentage",
      );
    }

    res.status(200).json({
      success: true,
      message: "Referral settings updated successfully",
    });
  } catch (error) {
    console.error("Update Referral Settings Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// @desc    Get user's referral tree
// @route   GET /api/admin/referrals/tree/:userId
// @access  Private/Admin
exports.getUserReferralTree = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
      .select("name email referralCode referralStats")
      .populate(
        "referralStats.directReferrals",
        "name email status miningStats.totalMined createdAt",
      )
      .populate(
        "referralStats.indirectReferrals",
        "name email status miningStats.totalMined createdAt",
      );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        referralCode: user.referralCode,
        stats: user.referralStats,
      },
    });
  } catch (error) {
    console.error("Get User Referral Tree Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// @desc    Export referral data
// @route   GET /api/admin/referrals/export
// @access  Private/Admin
exports.exportReferrals = async (req, res) => {
  try {
    const { type, status, startDate, endDate } = req.query;

    const query = {};
    if (type && type !== "all") query.type = type;
    if (status && status !== "all") query.status = status;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const referrals = await Referral.find(query)
      .populate("referrer", "name email")
      .populate("referred", "name email")
      .lean();

    const exportData = referrals.map((ref) => ({
      ReferrerName: ref.referrer?.name || "N/A",
      ReferrerEmail: ref.referrer?.email || "N/A",
      ReferredName: ref.referred?.name || "N/A",
      ReferredEmail: ref.referred?.email || "N/A",
      Type: ref.type,
      Status: ref.status,
      Bonus: ref.coinsEarned,
      Date: ref.createdAt,
    }));

    res.status(200).json({
      success: true,
      data: exportData,
    });
  } catch (error) {
    console.error("Export Referrals Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
