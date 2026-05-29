const mongoose = require("mongoose");
const crypto = require("crypto");
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

    const startTime = new Date();
    // Create mining session
    const session = await MiningSession.create({
      user: user._id,
      startTime,
      endTime,
      baseRate: rewards.baseRate,
      referralBoost: rewards.referralBoostRate,
      levelBoost: rewards.levelBoostRate,
      totalRate: rewards.totalRate,
      expectedCoins: rewards.totalEarnings,
      status: "active", // Explicitly set status
      lastRewardCalcAt: startTime,
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

// @desc    Boost mining speed (using coins)
// @route   POST /api/mining/boost
// @access  Private
const boostMining = async (req, res) => {
  const dbSession = await mongoose.startSession();
  dbSession.startTransaction();

  try {
    const { boostType } = req.body; // 'speed', 'duration'

    if (!boostType || !["speed", "duration"].includes(boostType)) {
      await dbSession.abortTransaction();
      await dbSession.endSession();
      return res.status(400).json({
        success: false,
        message: 'Invalid boost type. Use "speed" or "duration"',
      });
    }

    const settings = await Settings.getSettings();

    // 1. Fetch user (using transaction session)
    const user = await User.findById(req.user._id).session(dbSession);
    if (!user) {
      await dbSession.abortTransaction();
      await dbSession.endSession();
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Check if mining is active (endTime must be in the future)
    if (!user.miningStats?.currentMiningEndTime) {
      await dbSession.abortTransaction();
      await dbSession.endSession();
      return res.status(400).json({
        success: false,
        message: "No active mining session to boost. Start mining first.",
      });
    }

    const miningEndTime = new Date(user.miningStats.currentMiningEndTime);
    if (miningEndTime <= new Date()) {
      await dbSession.abortTransaction();
      await dbSession.endSession();
      return res.status(400).json({
        success: false,
        message:
          "Mining session has ended. Claim rewards and start a new session.",
      });
    }

    // 2. Find active session (using transaction session)
    let activeSession = await MiningSession.findOne({
      user: user._id,
      status: "active",
    }).sort({ createdAt: -1 }).session(dbSession);

    // If no active session found, try finding by endTime
    if (!activeSession) {
      activeSession = await MiningSession.findOne({
        user: user._id,
        endTime: { $gt: new Date() },
        status: { $ne: "cancelled" },
      }).sort({ createdAt: -1 }).session(dbSession);

      // Update status to active if found
      if (activeSession && activeSession.status !== "active") {
        activeSession.status = "active";
      }
    }

    if (!activeSession) {
      await dbSession.abortTransaction();
      await dbSession.endSession();
      return res.status(400).json({
        success: false,
        message: "Mining session not found. Please restart mining.",
      });
    }

    // 3. Concurrency Lock check (Race Condition Lock)
    const now = new Date();
    const lockQuery = {
      _id: activeSession._id,
      status: "active",
      $or: [
        { boostLockAt: null },
        { boostLockAt: { $lte: new Date(Date.now() - 10 * 1000) } } // 10 seconds lock timeout
      ]
    };
    
    const lockUpdate = {
      $set: { boostLockAt: now }
    };
    
    const session = await MiningSession.findOneAndUpdate(lockQuery, lockUpdate, {
      new: true,
      session: dbSession
    });

    if (!session) {
      await dbSession.abortTransaction();
      await dbSession.endSession();
      return res.status(409).json({
        success: false,
        message: "Another boost operation is currently in progress. Please try again.",
      });
    }

    // 3.1 Cooldown Check (using lastBoostAt)
    const lastBoost = session.lastBoostAt ? new Date(session.lastBoostAt) : null;
    if (lastBoost) {
      const diffMs = now - lastBoost;
      const diffMins = diffMs / (1000 * 60);
      if (diffMins < 30) {
        const remainingSeconds = Math.ceil((30 - diffMins) * 60);
        const remainingMinutes = Math.floor(remainingSeconds / 60);
        const secs = remainingSeconds % 60;
        const timeStr = remainingMinutes > 0 ? `${remainingMinutes}m ${secs}s` : `${secs}s`;
        
        await dbSession.abortTransaction();
        await dbSession.endSession();
        return res.status(400).json({
          success: false,
          message: `Already boosted! Try again after 30 minutes. Remaining time: ${timeStr}.`,
          cooldownRemaining: remainingSeconds,
        });
      }
    }

    const boostCost = settings.boostCost || 0; // Cost in coins
    
    // 4. Get or create wallet (using transaction session)
    let wallet = await Wallet.findOne({ user: user._id }).session(dbSession);
    if (!wallet) {
      wallet = new Wallet({
        user: user._id,
        miningBalance: user.miningStats?.totalCoins || 0,
        totalMined: user.miningStats?.totalMined || 0,
      });
    }

    // 5. Total available check including referralBalance
    const miningBal = wallet.miningBalance || 0;
    const referralBal = wallet.referralBalance || 0;
    const purchaseBal = wallet.purchaseBalance || 0;
    const totalAvailable = miningBal + referralBal + purchaseBal;

    if (totalAvailable < boostCost) {
      await dbSession.abortTransaction();
      await dbSession.endSession();
      return res.status(400).json({
        success: false,
        message: `Insufficient coins. You need ${boostCost} coins to boost. Available: ${totalAvailable.toFixed(2)}`,
      });
    }

    // 6. Deduct coins following preference: mining -> referral -> purchase
    let remainingCost = boostCost;
    
    if (wallet.miningBalance >= remainingCost) {
      wallet.miningBalance -= remainingCost;
      remainingCost = 0;
    } else {
      remainingCost -= wallet.miningBalance;
      wallet.miningBalance = 0;
    }

    if (remainingCost > 0) {
      if (wallet.referralBalance >= remainingCost) {
        wallet.referralBalance -= remainingCost;
        remainingCost = 0;
      } else {
        remainingCost -= wallet.referralBalance;
        wallet.referralBalance = 0;
      }
    }

    if (remainingCost > 0) {
      wallet.purchaseBalance = Math.max(0, wallet.purchaseBalance - remainingCost);
    }

    wallet.coinBalance = (wallet.miningBalance || 0) + (wallet.purchaseBalance || 0) + (wallet.referralBalance || 0);
    user.miningStats.totalCoins = wallet.coinBalance;

    // 7. Calculate correct accrued segment and expectedCoins
    const lastChangeTime = session.lastRewardCalcAt || session.startTime;
    const elapsedMs = now - new Date(lastChangeTime);
    const elapsedHours = Math.max(0, elapsedMs / (1000 * 60 * 60));
    const accruedSegment = session.totalRate * elapsedHours;
    
    session.coinsEarned = (session.coinsEarned || 0) + accruedSegment;

    if (boostType === "speed") {
      session.totalRate = (session.totalRate || settings.miningRate || 0.25) * 1.5;

      const remainingMs = new Date(session.endTime) - now;
      const remainingHours = Math.max(0, remainingMs / (1000 * 60 * 60));
      session.expectedCoins = session.coinsEarned + (session.totalRate * remainingHours);
    } else {
      const currentEndTime = new Date(session.endTime);
      const newEndTime = new Date(currentEndTime.getTime() - 4 * 60 * 60 * 1000);
      const minEndTime = new Date(now.getTime() + 10 * 60 * 1000); // Guarantees 10 minutes remaining

      session.endTime = newEndTime > minEndTime ? newEndTime : minEndTime;
      user.miningStats.currentMiningEndTime = session.endTime;
      
      const remainingMs = new Date(session.endTime) - now;
      const remainingHours = Math.max(0, remainingMs / (1000 * 60 * 60));
      session.expectedCoins = session.coinsEarned + (session.totalRate * remainingHours);
    }

    // 7.1 Update tracking timestamps and release concurrency lock
    session.lastBoostAt = now;
    session.lastRewardCalcAt = now;
    session.boostLockAt = null;

    await wallet.save({ session: dbSession });
    await session.save({ session: dbSession });
    await user.save({ session: dbSession });

    // 8. Create transaction record with secure random UUID
    const boostDescription =
      boostType === "speed"
        ? "Speed Boost - Mining rate increased by 50%"
        : "Time Boost - Mining duration reduced by 4 hours";

    const transactionId = `BOOST-${crypto.randomUUID()}`;

    await Transaction.create([{
      user: user._id,
      type: "purchase",
      amount: boostCost,
      coins: -boostCost,
      currency: "OLR",
      status: "completed",
      paymentMethod: "wallet",
      description: boostDescription,
      transactionId: transactionId,
      balanceAfter: wallet.coinBalance,
      processedAt: new Date(),
      metadata: {
        walletType: "auto",
        boostType: boostType,
        sessionId: session._id,
      },
    }], { session: dbSession });

    await dbSession.commitTransaction();
    await dbSession.endSession();

    console.log(
      `Boost applied: ${boostType} for user ${user._id}, cost: ${boostCost}`
    );

    const io = req.app.get("io");
    const connectedUsers = req.app.get("connectedUsers");
    const socketId = connectedUsers?.get(user._id.toString());

    if (io && socketId) {
      const walletData = {
        miningBalance: wallet.miningBalance || 0,
        purchaseBalance: wallet.purchaseBalance || 0,
        referralBalance: wallet.referralBalance || 0,
        totalBalance: wallet.coinBalance,
        lastUpdated: new Date().toISOString(),
        reason: "boost_purchase",
      };
      io.to(socketId).emit("wallet-update", walletData);
      console.log(`Emitted wallet-update to user ${user._id}`);
    }

    res.status(200).json({
      success: true,
      message: `Mining boosted! ${boostType === "speed" ? "Rate increased by 50%" : "Time reduced by 4 hours"}`,
      newExpectedCoins: session.expectedCoins,
      newEndTime: session.endTime,
      newRate: session.totalRate,
      coinsSpent: boostCost,
      remainingCoins: wallet.coinBalance,
      wallets: {
        mining: wallet.miningBalance || 0,
        purchase: wallet.purchaseBalance || 0,
        referral: wallet.referralBalance || 0,
        total: wallet.coinBalance,
      },
    });
  } catch (error) {
    await dbSession.abortTransaction();
    await dbSession.endSession();
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
