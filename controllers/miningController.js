const User = require("../models/User");
const Wallet = require("../models/Wallet");
const MiningSession = require("../models/MiningSession");
const Settings = require("../models/Settings");
const Notification = require("../models/Notification");
const Transaction = require("../models/Transaction");
const {
  calculateMiningRewards,
  formatTimeRemaining,
  parsePagination,
} = require("../utils/helpers");

// @desc    Start mining
// @route   POST /api/mining/start
// @access  Private
const startMining = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const settings = await Settings.getSettings();

    // Check if already mining
    if (user.miningStats?.currentMiningEndTime) {
      const endTime = new Date(user.miningStats.currentMiningEndTime);
      if (endTime > new Date()) {
        return res.status(400).json({
          success: false,
          message: "Mining already in progress",
          timeRemaining: formatTimeRemaining(endTime),
        });
      }
    }

    // Check if maintenance mode
    if (settings.maintenanceMode) {
      return res.status(503).json({
        success: false,
        message: "Mining is currently under maintenance",
      });
    }

    // Calculate mining rewards
    const rewards = calculateMiningRewards(user, settings);
    const cycleDuration = settings.miningCycleDuration || 24; // hours
    const endTime = new Date(Date.now() + cycleDuration * 60 * 60 * 1000);

    // Create mining session
    const session = await MiningSession.create({
      user: user._id,
      startTime: new Date(),
      endTime,
      baseRate: rewards.baseRate,
      referralBoost: rewards.referralBoostRate,
      levelBoost: rewards.levelBoostRate,
      totalRate: rewards.totalRate,
      expectedCoins: rewards.totalEarnings,
      status: "active", // Explicitly set status
    });

    // Update user mining stats
    user.miningStats.currentMiningEndTime = endTime;
    user.miningStats.lastMiningTime = new Date();
    user.ownershipProgress.miningSessions += 1;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Mining started successfully",
      session: {
        id: session._id,
        startTime: session.startTime,
        endTime: session.endTime,
        expectedCoins: session.expectedCoins,
        rates: {
          baseRate: rewards.baseRate,
          referralRate: rewards.referralBoostRate,
          levelBoost: rewards.levelBoostRate,
          totalRate: rewards.totalRate,
        },
      },
      timeRemaining: formatTimeRemaining(endTime),
    });
  } catch (error) {
    console.error("Start Mining Error:", error);
    res.status(500).json({ success: false, message: "Failed to start mining" });
  }
};

// @desc    Get mining status
// @route   GET /api/mining/status
// @access  Private
const getMiningStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const settings = await Settings.getSettings();

    let status = "idle";
    let timeRemaining = null;
    let currentSession = null;

    // Check if mining is active
    if (user.miningStats?.currentMiningEndTime) {
      const endTime = new Date(user.miningStats.currentMiningEndTime);
      if (endTime > new Date()) {
        status = "mining";
        timeRemaining = formatTimeRemaining(endTime);

        // Find active session - try multiple queries
        currentSession = await MiningSession.findOne({
          user: user._id,
          status: "active",
        }).sort({ createdAt: -1 });

        // Fallback: find by endTime if no active session found
        if (!currentSession) {
          currentSession = await MiningSession.findOne({
            user: user._id,
            endTime: { $gt: new Date() },
          }).sort({ createdAt: -1 });

          // Fix the status if found
          if (currentSession && currentSession.status !== "active") {
            currentSession.status = "active";
            await currentSession.save();
          }
        }
      } else {
        // Mining cycle complete but not claimed
        status = "complete";
        currentSession = await MiningSession.findOne({
          user: user._id,
          status: "active",
        }).sort({ createdAt: -1 });

        // Fallback for completed sessions
        if (!currentSession) {
          currentSession = await MiningSession.findOne({
            user: user._id,
            endTime: { $lte: new Date() },
            status: { $ne: "cancelled" },
          }).sort({ createdAt: -1 });
        }
      }
    }

    // Calculate rates for next session
    const rewards = calculateMiningRewards(user, settings);
    let liveExpectedCoins = currentSession?.expectedCoins || 0;

    if (currentSession && currentSession.status === "active") {
      const now = new Date();
      const remainingMs = new Date(currentSession.endTime) - now;
      const remainingHours = Math.max(0, remainingMs / (1000 * 60 * 60));
      liveExpectedCoins = currentSession.totalRate * remainingHours;
    }

    res.status(200).json({
      success: true,
      status,
      timeRemaining,
      currentSession: currentSession
        ? {
            id: currentSession._id,
            startTime: currentSession.startTime,
            endTime: currentSession.endTime,
            expectedCoins: liveExpectedCoins,
            miningRate: currentSession.totalRate,
            status: currentSession.status,
          }
        : null,
      nextSessionRates: {
        baseRate: rewards.baseRate,
        referralRate: rewards.referralBoostRate,
        levelBoost: rewards.levelBoostRate,
        totalRate: rewards.totalRate,
        expectedCoins: rewards.totalEarnings,
      },
      stats: {
        totalCoins: user.miningStats?.totalCoins || 0,
        totalMined: user.miningStats?.totalMined || 0,
        level: user.miningStats?.level || 1,
        streak: user.miningStats?.streak || 0,
      },
    });
  } catch (error) {
    console.error("Get Mining Status Error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to get mining status" });
  }
};

// @desc    Claim mining rewards
// @route   POST /api/mining/claim
// @access  Private
const claimRewards = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    // Check if there's a completed session to claim
    const session = await MiningSession.findOne({
      user: user._id,
      status: "active",
    }).sort({ createdAt: -1 });

    if (!session) {
      return res.status(400).json({
        success: false,
        message: "No rewards to claim",
      });
    }

    const endTime = new Date(session.endTime);
    if (endTime > new Date()) {
      return res.status(400).json({
        success: false,
        message: "Mining cycle not yet complete",
        timeRemaining: formatTimeRemaining(endTime),
      });
    }

    // Update session
    session.status = "completed";
    session.coinsEarned = session.expectedCoins;
    await session.save();

    // Update user coins
    user.miningStats.totalCoins += session.coinsEarned;
    user.miningStats.totalMined += session.coinsEarned;
    user.miningStats.currentMiningEndTime = null;

    // Update streak
    const lastMining = user.miningStats.lastMiningTime;
    if (lastMining) {
      const hoursSinceLastMining =
        (Date.now() - new Date(lastMining)) / (1000 * 60 * 60);
      if (hoursSinceLastMining <= 48) {
        user.miningStats.streak += 1;
      } else {
        user.miningStats.streak = 1;
      }
    }

    // Level up check (every 100 coins mined = 1 level)
    const newLevel = Math.floor(user.miningStats.totalMined / 100) + 1;
    if (newLevel > user.miningStats.level) {
      user.miningStats.level = newLevel;

      // Send level up notification
      await Notification.create({
        user: user._id,
        type: "mining",
        title: "Level Up! 🎉",
        message: `Congratulations! You've reached Level ${newLevel}!`,
      });
    }

    await user.save();

    // ========== ADD TO MINING WALLET ==========
    let wallet = await Wallet.findOne({ user: user._id });
    if (!wallet) {
      wallet = await Wallet.create({ user: user._id });
    }
    await wallet.addMiningCoins(session.coinsEarned);

    // Emit wallet update via Socket.io for real-time update
    const io = req.app.get("io");
    const connectedUsers = req.app.get("connectedUsers");
    const socketId = connectedUsers?.get(user._id.toString());

    if (io && socketId) {
      const walletData = {
        miningBalance: wallet.miningBalance || 0,
        purchaseBalance: wallet.purchaseBalance || 0,
        referralBalance: wallet.referralBalance || 0,
        totalBalance:
          (wallet.miningBalance || 0) +
          (wallet.purchaseBalance || 0) +
          (wallet.referralBalance || 0),
        lastUpdated: new Date().toISOString(),
        reason: "mining_claimed",
        coinsEarned: session.coinsEarned,
      };
      io.to(socketId).emit("wallet-update", walletData);
      console.log(
        `Emitted wallet-update to user ${user._id} after claiming ${session.coinsEarned} coins`,
      );
    }

    res.status(200).json({
      success: true,
      message: "Rewards claimed successfully",
      coinsEarned: session.coinsEarned,
      totalCoins: user.miningStats.totalCoins,
      level: user.miningStats.level,
      streak: user.miningStats.streak,
      wallets: {
        mining: wallet.miningBalance,
        purchase: wallet.purchaseBalance,
        total:
          wallet.miningBalance +
          wallet.purchaseBalance +
          wallet.referralBalance,
      },
    });
  } catch (error) {
    console.error("Claim Rewards Error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to claim rewards" });
  }
};

// @desc    Get mining history
// @route   GET /api/mining/history
// @access  Private
const getMiningHistory = async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);

    const sessions = await MiningSession.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await MiningSession.countDocuments({ user: req.user._id });

    // Calculate summary
    const summary = await MiningSession.aggregate([
      { $match: { user: req.user._id, status: "completed" } },
      {
        $group: {
          _id: null,
          totalSessions: { $sum: 1 },
          totalCoins: { $sum: "$coinsEarned" },
          avgCoins: { $avg: "$coinsEarned" },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      sessions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      summary: summary[0] || { totalSessions: 0, totalCoins: 0, avgCoins: 0 },
    });
  } catch (error) {
    console.error("Get Mining History Error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to get mining history" });
  }
};

// @desc    Cancel active mining (forfeit rewards)
// @route   POST /api/mining/cancel
// @access  Private
const cancelMining = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    const session = await MiningSession.findOne({
      user: user._id,
      status: "active",
    });

    if (!session) {
      return res.status(400).json({
        success: false,
        message: "No active mining session",
      });
    }

    // Cancel session
    session.status = "cancelled";
    session.coinsEarned = 0;
    await session.save();

    // Reset user mining state
    user.miningStats.currentMiningEndTime = null;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Mining cancelled. No rewards earned.",
    });
  } catch (error) {
    console.error("Cancel Mining Error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to cancel mining" });
  }
};

// @desc    Get mining leaderboard
// @route   GET /api/mining/leaderboard
// @access  Private
const getLeaderboard = async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const { period } = req.query; // 'daily', 'weekly', 'monthly', 'alltime'

    let dateFilter = {};
    const now = new Date();

    if (period === "daily") {
      dateFilter = { createdAt: { $gte: new Date(now.setHours(0, 0, 0, 0)) } };
    } else if (period === "weekly") {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      dateFilter = { createdAt: { $gte: weekAgo } };
    } else if (period === "monthly") {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      dateFilter = { createdAt: { $gte: monthAgo } };
    }

    // Get top miners
    const leaderboard = await User.find({ status: "active" })
      .select(
        "name avatar miningStats.totalMined miningStats.level miningStats.streak",
      )
      .sort({ "miningStats.totalMined": -1 })
      .skip(skip)
      .limit(limit);

    // Get current user's rank
    const currentUser = await User.findById(req.user._id);
    const userRank =
      (await User.countDocuments({
        status: "active",
        "miningStats.totalMined": {
          $gt: currentUser.miningStats?.totalMined || 0,
        },
      })) + 1;

    res.status(200).json({
      success: true,
      leaderboard: leaderboard.map((user, index) => ({
        rank: skip + index + 1,
        name: user.name,
        avatar: user.avatar,
        totalMined: user.miningStats?.totalMined || 0,
        level: user.miningStats?.level || 1,
        streak: user.miningStats?.streak || 0,
        isCurrentUser: user._id.toString() === req.user._id.toString(),
      })),
      currentUserRank: {
        rank: userRank,
        totalMined: currentUser.miningStats?.totalMined || 0,
        level: currentUser.miningStats?.level || 1,
      },
      pagination: {
        page,
        limit,
      },
    });
  } catch (error) {
    console.error("Get Leaderboard Error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to get leaderboard" });
  }
};

// @desc    Progressive boost mining speed (30 min cooldown)
// @route   POST /api/mining/boost
// @access  Private
const boostMining = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const settings = await Settings.getSettings();

    // Check active mining
    if (!user.miningStats?.currentMiningEndTime) {
      return res.status(400).json({
        success: false,
        message: "No active mining session to boost.",
      });
    }

    let session = await MiningSession.findOne({
      user: user._id,
      status: "active",
      endTime: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    if (!session) {
      return res.status(400).json({
        success: false,
        message: "Active mining session not found.",
      });
    }

    // ⏱️ Check 30 minutes cooldown
    const now = new Date();
    if (session.lastBoostAt) {
      const diffMinutes = (now - new Date(session.lastBoostAt)) / (1000 * 60);
      if (diffMinutes < 30) {
        const wait = Math.ceil(30 - diffMinutes);
        return res.status(400).json({
          success: false,
          message: `Please wait ${wait} more minutes before boosting again.`,
        });
      }
    }

    // 💰 Cost
    const boostCost = settings.boostCost || 50;

    // Get wallet
    let wallet = await Wallet.findOne({ user: user._id });
    if (!wallet) {
      wallet = await Wallet.create({ user: user._id });
    }

    const totalAvailable =
      (wallet.miningBalance || 0) + (wallet.purchaseBalance || 0);

    if (totalAvailable < boostCost) {
      return res.status(400).json({
        success: false,
        message: `Insufficient coins. Need ${boostCost}, available ${totalAvailable}`,
      });
    }

    // Deduct coins (auto: mining first then purchase)
    let remaining = boostCost;
    if (wallet.miningBalance >= remaining) {
      wallet.miningBalance -= remaining;
    } else {
      remaining -= wallet.miningBalance;
      wallet.miningBalance = 0;
      wallet.purchaseBalance -= remaining;
    }

    // 🔼 Calculate new boost
    let addedBoost;
    if (!session.boostPercent || session.boostPercent === 0) {
      addedBoost = 10; // first time
    } else {
      addedBoost = 20; // next times
    }

    session.boostPercent = (session.boostPercent || 0) + addedBoost;
    session.lastBoostAt = now;

    // 🧮 Recalculate rate
    const baseTotalRate =
      (session.baseRate || 0) +
      (session.referralBoost || 0) +
      (session.levelBoost || 0);

    const boostedRate = baseTotalRate * (1 + session.boostPercent / 100);
    session.totalRate = boostedRate;

    // Recalculate expected coins from now
    const remainingMs = new Date(session.endTime) - now;
    const remainingHours = Math.max(0, remainingMs / (1000 * 60 * 60));
    session.expectedCoins = boostedRate * remainingHours;

    await wallet.save();
    await session.save();

    // Save transaction
    await Transaction.create({
      user: user._id,
      type: "purchase",
      amount: boostCost,
      coins: -boostCost,
      currency: "COIN",
      status: "completed",
      paymentMethod: "wallet",
      description: `Mining Boost +${addedBoost}% (Total Boost: ${session.boostPercent}%)`,
      balanceAfter: (wallet.miningBalance || 0) + (wallet.purchaseBalance || 0),
      processedAt: new Date(),
      metadata: {
        boostType: "progressive",
        sessionId: session._id,
      },
    });

    return res.status(200).json({
      success: true,
      message: `Boost applied! +${addedBoost}% (Total: ${session.boostPercent}%)`,
      boostPercent: session.boostPercent,
      newRate: session.totalRate,
      newExpectedCoins: session.expectedCoins,
      nextBoostAvailableInMinutes: 30,
      wallets: {
        mining: wallet.miningBalance || 0,
        purchase: wallet.purchaseBalance || 0,
        referral: wallet.referralBalance || 0,
        total:
          (wallet.miningBalance || 0) +
          (wallet.purchaseBalance || 0) +
          (wallet.referralBalance || 0),
      },
    });
  } catch (error) {
    console.error("Boost Mining Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to boost mining: " + error.message,
    });
  }
};

// @desc    Get mining rewards breakdown
// @route   GET /api/mining/rewards
// @access  Private
const getRewardsBreakdown = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const settings = await Settings.getSettings();

    const baseRate = settings.miningRate || 0.25;
    const cycleDuration = settings.miningCycleDuration || 24;

    // Calculate all bonus rates
    const activeReferrals = user.referralStats?.activeCount || 0;
    const referralBoostPercent = Math.min(activeReferrals * 20, 100); // 20% per referral, max 100%
    const levelBoostPercent = ((user.miningStats?.level || 1) - 1) * 5; // 5% per level
    const streakBoostPercent = Math.min(
      (user.miningStats?.streak || 0) * 2,
      20,
    ); // 2% per day, max 20%

    const referralBoost = baseRate * (referralBoostPercent / 100);
    const levelBoost = baseRate * (levelBoostPercent / 100);
    const streakBoost = baseRate * (streakBoostPercent / 100);
    const totalRate = baseRate + referralBoost + levelBoost + streakBoost;

    res.status(200).json({
      success: true,
      breakdown: {
        baseRate,
        baseEarnings: baseRate * cycleDuration,
        referral: {
          activeReferrals,
          boostPercent: referralBoostPercent,
          bonusRate: referralBoost,
          bonusEarnings: referralBoost * cycleDuration,
        },
        level: {
          currentLevel: user.miningStats?.level || 1,
          boostPercent: levelBoostPercent,
          bonusRate: levelBoost,
          bonusEarnings: levelBoost * cycleDuration,
        },
        streak: {
          currentStreak: user.miningStats?.streak || 0,
          boostPercent: streakBoostPercent,
          bonusRate: streakBoost,
          bonusEarnings: streakBoost * cycleDuration,
        },
        total: {
          rate: totalRate,
          earnings: totalRate * cycleDuration,
          cycleDuration,
        },
      },
    });
  } catch (error) {
    console.error("Get Rewards Breakdown Error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to get rewards breakdown" });
  }
};

module.exports = {
  startMining,
  getMiningStatus,
  claimRewards,
  getMiningHistory,
  cancelMining,
  getLeaderboard,
  boostMining,
  getRewardsBreakdown,
};
