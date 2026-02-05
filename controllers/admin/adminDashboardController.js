const User = require("../../models/User");
const Wallet = require("../../models/Wallet");
const MiningSession = require("../../models/MiningSession");
const Transaction = require("../../models/Transaction");
const KYC = require("../../models/KYC");
const Referral = require("../../models/Referral");

// @desc    Get dashboard stats
// @route   GET /api/admin/dashboard
// @access  Private/Admin
exports.getDashboardStats = async (req, res) => {
  try {
    const { period = "week" } = req.query;

    // ===== Signup activity logic (Today / Yesterday / Last Active Day) =====
    function startOfDay(date) {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      return d;
    }

    const todayStart = startOfDay(new Date());
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);

    // Count today
    const todayCount = await User.countDocuments({
      createdAt: { $gte: todayStart },
    });

    // Count yesterday
    const yesterdayCount = await User.countDocuments({
      createdAt: { $gte: yesterdayStart, $lt: todayStart },
    });

    // Fallback: find last day with signups
    let lastActiveDay = null;
    let lastActiveCount = 0;

    if (todayCount === 0 && yesterdayCount === 0) {
      const lastDayAgg = await User.aggregate([
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: -1 } },
        { $limit: 1 },
      ]);

      if (lastDayAgg.length > 0) {
        lastActiveDay = lastDayAgg[0]._id;
        lastActiveCount = lastDayAgg[0].count;
      }
    }

    // Decide what to show
    let signupActivity = {
      label: "today",
      count: todayCount,
    };

    if (todayCount === 0 && yesterdayCount > 0) {
      signupActivity = {
        label: "yesterday",
        count: yesterdayCount,
      };
    } else if (todayCount === 0 && yesterdayCount === 0 && lastActiveDay) {
      signupActivity = {
        label: lastActiveDay, // e.g. "2026-02-03"
        count: lastActiveCount,
      };
    }

    // Calculate date ranges
    const now = new Date();
    let startDate;
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
      case "year":
        startDate = new Date(now.setFullYear(now.getFullYear() - 1));
        break;
      default:
        startDate = new Date(now.setDate(now.getDate() - 7));
    }

    // User stats
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ status: "active" });
    const newUsers = await User.countDocuments({
      createdAt: { $gte: startDate },
    });
    const suspendedUsers = await User.countDocuments({ status: "suspended" });

    // KYC stats
    const pendingKYC = await KYC.countDocuments({ status: "pending" });
    const approvedKYC = await KYC.countDocuments({ status: "approved" });
    const rejectedKYC = await KYC.countDocuments({ status: "rejected" });

    // Mining stats
    const activeMiningSession = await MiningSession.countDocuments({
      status: "active",
    });
    const totalMiningSessions = await MiningSession.countDocuments();

    // Calculate total mined coins from MiningSession (earnedCoins)
    const totalMinedFromSessions = await MiningSession.aggregate([
      { $match: { status: "completed" } },
      { $group: { _id: null, total: { $sum: "$earnedCoins" } } },
    ]);

    // Also calculate total mined coins from User miningStats (more accurate)
    const totalMinedFromUsers = await User.aggregate([
      { $group: { _id: null, total: { $sum: "$miningStats.totalMined" } } },
    ]);

    // Use the higher value (user stats are more accurate)
    const totalMinedCoins = Math.max(
      totalMinedFromSessions[0]?.total || 0,
      totalMinedFromUsers[0]?.total || 0,
    );

    // Also get total coins (including purchased, referral bonuses, etc.)
    const totalCoinsFromUsers = await User.aggregate([
      { $group: { _id: null, total: { $sum: "$miningStats.totalCoins" } } },
    ]);
    const totalCoins = totalCoinsFromUsers[0]?.total || 0;

    // Transaction stats
    const pendingWithdrawals = await Transaction.countDocuments({
      type: "withdrawal",
      status: "pending",
    });
    const totalWithdrawalsResult = await Transaction.aggregate([
      { $match: { type: "withdrawal", status: "completed" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const totalWithdrawals = totalWithdrawalsResult[0]?.total || 0;

    // Referral stats
    const totalReferrals = await Referral.countDocuments();
    const activeReferrals = await Referral.countDocuments({ status: "active" });

    // Revenue from coin purchases
    const revenueResult = await Transaction.aggregate([
      { $match: { type: "purchase", status: "completed" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const totalRevenue = revenueResult[0]?.total || 0;

    // Chart data - User growth over time
    const userGrowth = await User.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Mining activity over time
    const miningActivity = await MiningSession.aggregate([
      { $match: { startTime: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$startTime" } },
          sessions: { $sum: 1 },
          coins: { $sum: "$earnedCoins" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Recent users
    const recentUsers = await User.find()
      .select("name email avatar status kycStatus miningStats createdAt")
      .sort("-createdAt")
      .limit(5);

    // Top miners
    const topMiners = await User.find()
      .select("name email avatar miningStats")
      .sort("-miningStats.totalMined")
      .limit(5);

    res.status(200).json({
      success: true,
      stats: {
        users: {
          total: totalUsers,
          active: activeUsers,
          new: newUsers,
          suspended: suspendedUsers,
        },
        kyc: {
          pending: pendingKYC,
          approved: approvedKYC,
          rejected: rejectedKYC,
        },
        mining: {
          activeSessions: activeMiningSession,
          totalSessions: totalMiningSessions,
          totalMinedCoins: Math.round(totalMinedCoins),
          totalCoins: Math.round(totalCoins),
        },
        transactions: {
          pendingWithdrawals,
          totalWithdrawals,
          totalRevenue,
        },
        referrals: {
          total: totalReferrals,
          active: activeReferrals,
        },
      },
      signupActivity, // ✅ ADD THIS LINE
      charts: {
        userGrowth,
        miningActivity,
      },
      recentUsers,
      topMiners,
    });
  } catch (error) {
    console.error("Dashboard Stats Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// @desc    Get system health
// @route   GET /api/admin/dashboard/health
// @access  Private/Admin
exports.getSystemHealth = async (req, res) => {
  try {
    const mongoose = require("mongoose");

    // Check database connection
    const dbStatus =
      mongoose.connection.readyState === 1 ? "connected" : "disconnected";

    // Get uptime
    const uptime = process.uptime();

    // Memory usage
    const memoryUsage = process.memoryUsage();

    res.status(200).json({
      success: true,
      health: {
        status: "healthy",
        database: dbStatus,
        uptime: Math.floor(uptime / 60), // in minutes
        memory: {
          heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
          heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
        },
        timestamp: new Date(),
      },
    });
  } catch (error) {
    console.error("System Health Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
