const User = require('../models/User');
const Wallet = require('../models/Wallet');
const MiningSession = require('../models/MiningSession');
const Notification = require('../models/Notification');
const { sendMiningCompleteEmail } = require('./sendEmail');

// Check for completed mining cycles and award coins
const checkMiningCycles = async () => {
  try {
    // Find all active mining sessions that have ended
    const completedSessions = await MiningSession.find({
      status: 'active',
      endTime: { $lte: new Date() },
    }).populate('user');

    console.log(`Found ${completedSessions.length} completed mining sessions`);

    for (const session of completedSessions) {
      try {
        const user = session.user;
        if (!user) continue;

        // Mark session as completed
        session.status = 'completed';
        session.coinsEarned = session.expectedCoins;
        await session.save();

        // Update user coins
        user.miningStats.totalCoins += session.coinsEarned;
        user.miningStats.totalMined += session.coinsEarned;
        user.miningStats.currentMiningEndTime = null;

        // Update streak
        const lastMining = user.miningStats.lastMiningTime;
        if (lastMining) {
          const hoursSinceLastMining = (Date.now() - new Date(lastMining)) / (1000 * 60 * 60);
          if (hoursSinceLastMining <= 48) {
            user.miningStats.streak += 1;
          } else {
            user.miningStats.streak = 1;
          }
        }

        // Check for level up
        const newLevel = Math.floor(user.miningStats.totalMined / 100) + 1;
        const leveledUp = newLevel > user.miningStats.level;
        if (leveledUp) {
          user.miningStats.level = newLevel;
        }

        await user.save();

        // ========== ADD TO MINING WALLET ==========
        let wallet = await Wallet.findOne({ user: user._id });
        if (!wallet) {
          wallet = await Wallet.create({ user: user._id });
        }
        await wallet.addMiningCoins(session.coinsEarned);

        // Send notification
        await Notification.create({
          user: user._id,
          type: 'mining',
          title: 'Mining Complete! ⛏️',
          message: `Your mining cycle is complete! You earned ${session.coinsEarned} coins in your Mining Wallet. ${leveledUp ? `Congratulations! You've reached Level ${newLevel}!` : 'Start a new cycle to keep earning!'}`,
        });

        // Send email notification
        try {
          await sendMiningCompleteEmail(user.email, user.name, session.coinsEarned);
        } catch (emailError) {
          console.error('Failed to send mining complete email:', emailError.message);
        }

        console.log(`Mining complete for user ${user.email}: +${session.coinsEarned} coins to Mining Wallet`);
      } catch (sessionError) {
        console.error(`Error processing session ${session._id}:`, sessionError.message);
      }
    }
  } catch (error) {
    console.error('Mining cycle check error:', error);
  }
};

// Send reminders to inactive users
const sendInactiveReminders = async () => {
  try {
    const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);

    // Find users who haven't mined in 48 hours
    const inactiveUsers = await User.find({
      status: 'active',
      $or: [
        { 'miningStats.lastMiningTime': { $lt: twoDaysAgo } },
        { 'miningStats.lastMiningTime': null },
      ],
    });

    console.log(`Found ${inactiveUsers.length} inactive users`);

    const notifications = inactiveUsers.map((user) => ({
      user: user._id,
      type: 'reminder',
      title: 'We Miss You! 👋',
      message: 'You haven\'t mined in a while. Start mining now to earn coins and maintain your streak!',
    }));

    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
      console.log(`Sent ${notifications.length} inactive reminders`);
    }
  } catch (error) {
    console.error('Inactive reminders error:', error);
  }
};

// Update user ownership progress (days active)
const updateOwnershipProgress = async () => {
  try {
    const users = await User.find({ status: 'active' });

    for (const user of users) {
      // Calculate days since registration
      const daysSinceRegistration = Math.floor((Date.now() - new Date(user.createdAt)) / (1000 * 60 * 60 * 24));
      
      if (daysSinceRegistration !== user.ownershipProgress.daysActive) {
        user.ownershipProgress.daysActive = daysSinceRegistration;

        // Check if user is now eligible for KYC
        if (daysSinceRegistration >= 30 && user.ownershipProgress.miningSessions >= 20 && !user.ownershipProgress.kycInvited) {
          user.ownershipProgress.kycInvited = true;

          // Send KYC invitation notification
          await Notification.create({
            user: user._id,
            type: 'kyc',
            title: 'KYC Invitation! 🎉',
            message: 'Congratulations! You are now eligible to complete KYC and unlock more features!',
          });
        }

        await user.save();
      }
    }
  } catch (error) {
    console.error('Update ownership progress error:', error);
  }
};

// Update referral active status
const updateReferralStatus = async () => {
  try {
    const users = await User.find({ status: 'active', 'referralStats.totalCount': { $gt: 0 } })
      .populate('referralStats.directReferrals');

    for (const user of users) {
      let activeCount = 0;
      const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);

      if (user.referralStats.directReferrals) {
        for (const referral of user.referralStats.directReferrals) {
          if (referral.miningStats?.lastMiningTime && new Date(referral.miningStats.lastMiningTime) > twoDaysAgo) {
            activeCount++;
          }
        }
      }

      if (activeCount !== user.referralStats.activeCount) {
        user.referralStats.activeCount = activeCount;
        await user.save();
      }
    }
  } catch (error) {
    console.error('Update referral status error:', error);
  }
};

// ========== TRANSFER REFERRAL BONUS TO MINING WALLET (Next Day) ==========
// This transfers referral earnings from referral wallet to mining wallet
// Should run daily at midnight
const transferReferralToMiningWallet = async () => {
  try {
    console.log('Starting daily referral wallet transfer...');
    
    // Find all wallets with referral balance > 0
    const walletsWithReferralBalance = await Wallet.find({
      referralBalance: { $gt: 0 }
    }).populate('user');

    console.log(`Found ${walletsWithReferralBalance.length} wallets with referral balance`);

    for (const wallet of walletsWithReferralBalance) {
      try {
        if (!wallet.user) continue;

        const referralAmount = wallet.referralBalance;
        
        // Transfer from referral wallet to mining wallet
        wallet.miningBalance += referralAmount;
        wallet.referralBalance = 0;
        
        // Update totals
        wallet.totalMined += referralAmount; // Add to total mined since it's now in mining wallet
        
        await wallet.save();

        // Send notification to user
        await Notification.create({
          user: wallet.user._id,
          type: 'wallet',
          title: 'Referral Bonus Transferred! 🎉',
          message: `${referralAmount.toFixed(2)} coins from your referral earnings have been transferred to your Mining Wallet. Keep referring friends to earn more!`,
        });

        console.log(`Transferred ${referralAmount} coins from referral to mining wallet for user ${wallet.user.email}`);
      } catch (walletError) {
        console.error(`Error transferring wallet ${wallet._id}:`, walletError.message);
      }
    }

    console.log('Daily referral wallet transfer completed');
  } catch (error) {
    console.error('Referral wallet transfer error:', error);
  }
};

module.exports = {
  checkMiningCycles,
  sendInactiveReminders,
  updateOwnershipProgress,
  updateReferralStatus,
  transferReferralToMiningWallet,
};
