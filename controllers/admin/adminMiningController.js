const MiningSession = require("../../models/MiningSession");
const User = require("../../models/User");
const Settings = require("../../models/Settings");
const { calculateMiningRewards } = require("../../utils/helpers");

// @desc    Get all mining sessions
// @route   GET /api/admin/mining
// @access  Private/Admin
exports.getAllMiningSessions = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      search,
      sortBy = "startTime",
      sortOrder = "desc",
    } = req.query;

    // Build query
    const query = {};

    if (status && status !== "all") {
      query.status = status;
    }

    // Build sort
    const sort = {};
    sort[sortBy] = sortOrder === "asc" ? 1 : -1;

    // Execute query with pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    let sessions = await MiningSession.find(query)
      .populate("user", "name email avatar")
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    // Filter by search if provided
    if (search) {
      sessions = sessions.filter(
        (session) =>
          session.user?.name?.toLowerCase().includes(search.toLowerCase()) ||
          session.user?.email?.toLowerCase().includes(search.toLowerCase()),
      );
    }

    const total = await MiningSession.countDocuments(query);

    res.status(200).json({
      success: true,
      sessions,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total,
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    console.error("Get All Mining Sessions Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// @desc    Get mining statistics
// @route   GET /api/admin/mining/stats
// @access  Private/Admin
exports.getMiningStats = async (req, res) => {
  try {
    const totalSessions = await MiningSession.countDocuments();
    const activeSessions = await MiningSession.countDocuments({
      status: "active",
    });
    const completedSessions = await MiningSession.countDocuments({
      status: "completed",
    });
    const cancelledSessions = await MiningSession.countDocuments({
      status: "cancelled",
    });

    // Total mined coins
    const totalMinedResult = await MiningSession.aggregate([
      { $match: { status: "completed" } },
      {
        $group: {
          _id: null,
          total: {
            $sum: { $ifNull: ["$coinsEarned", "$earnedCoins"] },
          },
        },
      },
    ]);

    const totalMinedCoins = totalMinedResult[0]?.total || 0;

    // Today's stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todaySessions = await MiningSession.countDocuments({
      startTime: { $gte: today },
    });

    const todayMinedResult = await MiningSession.aggregate([
      { $match: { startTime: { $gte: today }, status: "completed" } },
      {
        $group: {
          _id: null,
          total: {
            $sum: { $ifNull: ["$coinsEarned", "$earnedCoins"] },
          },
        },
      },
    ]);

    const todayMinedCoins = todayMinedResult[0]?.total || 0;

    // Top miners today
    const topMinersToday = await MiningSession.aggregate([
      { $match: { startTime: { $gte: today }, status: "completed" } },
      {
        $group: {
          _id: "$user",
          totalCoins: {
            $sum: { $ifNull: ["$coinsEarned", "$earnedCoins"] },
          },
        },
      },
      { $sort: { totalCoins: -1 } },
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
          totalCoins: 1,
          userName: "$userInfo.name",
          userEmail: "$userInfo.email",
        },
      },
    ]);

    // Hourly mining activity for last 24 hours (for chart)
    const yesterday = new Date();
    yesterday.setHours(yesterday.getHours() - 24);

    const hourlyActivity = await MiningSession.aggregate([
      {
        $match: {
          startTime: { $gte: yesterday },
          status: { $in: ["completed", "active"] },
        },
      },
      {
        $group: {
          _id: { $hour: "$startTime" },
          coins: {
            $sum: { $ifNull: ["$coinsEarned", "$earnedCoins"] },
          },
          sessions: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Format hourly data for chart (fill missing hours with 0)
    const hourlyData = [];
    for (let i = 0; i < 24; i += 4) {
      const hourStr = `${String(i).padStart(2, "0")}:00`;
      const hourData = hourlyActivity.filter(
        (h) => h._id >= i && h._id < i + 4,
      );
      const totalCoins = hourData.reduce((sum, h) => sum + (h.coins || 0), 0);
      hourlyData.push({ hour: hourStr, coins: Math.round(totalCoins) });
    }
    hourlyData.push({ hour: "24:00", coins: hourlyData[0]?.coins || 0 });

    // Level distribution - calculate from user mining stats
    const userStats = await User.aggregate([
      { $match: { "miningStats.totalMined": { $gt: 0 } } },
      {
        $group: {
          _id: null,
          totalUsers: { $sum: 1 },
          withReferrals: {
            $sum: {
              $cond: [{ $gt: ["$referralStats.directReferrals", 0] }, 1, 0],
            },
          },
          boostedUsers: {
            $sum: { $cond: [{ $gt: ["$miningStats.boostLevel", 1] }, 1, 0] },
          },
        },
      },
    ]);

    const totalUsers = userStats[0]?.totalUsers || 100;
    const withReferrals = userStats[0]?.withReferrals || 0;
    const boostedUsers = userStats[0]?.boostedUsers || 0;
    const baseUsers = totalUsers - withReferrals - boostedUsers;

    const levelDistribution = [
      {
        name: "Base Level",
        value: Math.round((baseUsers / totalUsers) * 100) || 60,
        color: "#ef4444",
      },
      {
        name: "Referral Level",
        value: Math.round((withReferrals / totalUsers) * 100) || 25,
        color: "#fbbf24",
      },
      {
        name: "Boost Level",
        value: Math.round((boostedUsers / totalUsers) * 100) || 15,
        color: "#22c55e",
      },
    ];

    res.status(200).json({
      success: true,
      stats: {
        total: totalSessions,
        active: activeSessions,
        completed: completedSessions,
        cancelled: cancelledSessions,
        totalMinedCoins: Math.round(totalMinedCoins),
        todaySessions,
        todayMinedCoins: Math.round(todayMinedCoins),
        topMinersToday,
        hourlyData,
        levelDistribution,
      },
    });
  } catch (error) {
    console.error("Mining Stats Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// @desc    Get mining settings
// @route   GET /api/admin/mining/settings
// @access  Private/Admin
exports.getMiningSettings = async (req, res) => {
  try {
    const settings = await Settings.getSettings();

    res.status(200).json({
      success: true,
      settings: {
        miningRate: settings.miningRate,
        miningCycleDuration: settings.miningCycleDuration,
        maxCoinsPerCycle: settings.maxCoinsPerCycle,
        boostCost: settings.boostCost,
        referralBoostPercent: settings.referralBoostPercent,
      },
    });
  } catch (error) {
    console.error("Get Mining Settings Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// @desc    Update mining settings
// @route   PUT /api/admin/mining/settings
// @access  Private/Admin
exports.updateMiningSettings = async (req, res) => {
  try {
    const {
      miningRate,
      miningCycleDuration,
      maxCoinsPerCycle,
      boostCost,
      referralBoostPercent,
    } = req.body;

    if (miningRate !== undefined) {
      await Settings.setSetting(
        "miningRate",
        miningRate,
        "Base mining rate per hour",
      );
    }
    if (miningCycleDuration !== undefined) {
      await Settings.setSetting(
        "miningCycleDuration",
        miningCycleDuration,
        "Mining cycle duration in hours",
      );
    }
    if (maxCoinsPerCycle !== undefined) {
      await Settings.setSetting(
        "maxCoinsPerCycle",
        maxCoinsPerCycle,
        "Maximum coins per mining cycle",
      );
    }
    if (boostCost !== undefined) {
      await Settings.setSetting("boostCost", boostCost, "Cost to boost mining");
    }
    if (referralBoostPercent !== undefined) {
      await Settings.setSetting(
        "referralBoostPercent",
        referralBoostPercent,
        "Referral boost percentage",
      );
    }

    // Get updated settings
    const updatedSettings = await Settings.getSettings();

    // 🔁 Recalculate all active mining sessions
    const activeSessions = await MiningSession.find({ status: "active" });

    for (const session of activeSessions) {
      const user = await User.findById(session.user);
      if (!user) continue;

      const rewards = calculateMiningRewards(user, updatedSettings);

      session.baseRate = rewards.baseRate;
      session.referralBoost = rewards.referralBoostRate;
      session.levelBoost = rewards.levelBoostRate;
      session.totalRate = rewards.totalRate;

      // Recalculate expected coins based on remaining time
      const now = new Date();
      const remainingMs = new Date(session.endTime) - now;
      const remainingHours = Math.max(0, remainingMs / (1000 * 60 * 60));

      session.expectedCoins = rewards.totalRate * remainingHours;

      await session.save();
    }

    res.status(200).json({
      success: true,
      message:
        "Mining settings updated successfully and active sessions recalculated",
      settings: {
        miningRate: updatedSettings.miningRate,
        miningCycleDuration: updatedSettings.miningCycleDuration,
        maxCoinsPerCycle: updatedSettings.maxCoinsPerCycle,
        boostCost: updatedSettings.boostCost,
        referralBoostPercent: updatedSettings.referralBoostPercent,
      },
      updatedActiveSessions: activeSessions.length,
    });
  } catch (error) {
    console.error("Update Mining Settings Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// @desc    Get active miners
// @route   GET /api/admin/mining/active
// @access  Private/Admin
exports.getActiveMiners = async (req, res) => {
  try {
    const activeSessions = await MiningSession.find({ status: "active" })
      .populate("user", "name email avatar miningStats")
      .sort("-startTime");

    res.status(200).json({
      success: true,
      count: activeSessions.length,
      activeMiners: activeSessions,
    });
  } catch (error) {
    console.error("Get Active Miners Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// @desc    Get leaderboard
// @route   GET /api/admin/mining/leaderboard
// @access  Private/Admin
exports.getLeaderboard = async (req, res) => {
  try {
    const { period = "all", limit = 10 } = req.query;

    let startDate;
    const now = new Date();

    switch (period) {
      case "today":
        startDate = new Date(now.setHours(0, 0, 0, 0));
        break;
      case "week":
        startDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case "month":
        startDate = new Date(now.setMonth(now.getMonth() - 1));
        break;
      default:
        startDate = null;
    }

    const matchQuery = { status: "completed" };
    if (startDate) {
      matchQuery.startTime = { $gte: startDate };
    }

    const leaderboard = await MiningSession.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: "$user",
          totalCoins: {
            $sum: { $ifNull: ["$coinsEarned", "$earnedCoins"] },
          },
          sessions: { $sum: 1 },
        },
      },
      { $sort: { totalCoins: -1 } },
      { $limit: parseInt(limit) },
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
          totalCoins: 1,
          sessions: 1,
          name: "$userInfo.name",
          email: "$userInfo.email",
          avatar: "$userInfo.avatar",
        },
      },
    ]);

    res.status(200).json({
      success: true,
      leaderboard,
    });
  } catch (error) {
    console.error("Get Leaderboard Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// @desc    Cancel user's mining session
// @route   PUT /api/admin/mining/:id/cancel
// @access  Private/Admin
exports.cancelMiningSession = async (req, res) => {
  try {
    const { reason } = req.body;

    const session = await MiningSession.findById(req.params.id);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Mining session not found",
      });
    }

    if (session.status !== "active") {
      return res.status(400).json({
        success: false,
        message: "Can only cancel active mining sessions",
      });
    }

    session.status = "cancelled";
    session.cancelledBy = "admin";
    session.cancellationReason = reason;
    await session.save();

    res.status(200).json({
      success: true,
      message: "Mining session cancelled",
      session,
    });
  } catch (error) {
    console.error("Cancel Mining Session Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
