const User = require('../models/User');
const Referral = require('../models/Referral');
const Notification = require('../models/Notification');
const { isUserActive, parsePagination, sanitizeUser } = require('../utils/helpers');

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
    if (type && type !== 'all') {
      query.type = type;
    }

    // Get referrals
    const referrals = await Referral.find(query)
      .populate('referred', 'name email avatar createdAt miningStats.lastMiningTime')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Referral.countDocuments(query);

    // Process referrals to add active status
    const processedReferrals = referrals.map((ref) => {
      const isActive = ref.referred ? isUserActive(ref.referred) : false;
      
      // Debug logging
      console.log('Processing referral:', {
        id: ref._id,
        referredId: ref.referred?._id,
        referredName: ref.referred?.name,
        coinsEarned: ref.coinsEarned,
        type: ref.type
      });
      
      return {
        id: ref._id,
        user: ref.referred ? {
          id: ref.referred._id,
          name: ref.referred.name,
          email: ref.referred.email,
          avatar: ref.referred.avatar,
          joinedAt: ref.referred.createdAt,
        } : null,
        type: ref.type,
        coinsEarned: ref.coinsEarned || 0,
        isActive,
        createdAt: ref.createdAt,
      };
    });

    // Get counts
    const directCount = await Referral.countDocuments({ referrer: req.user._id, type: 'direct' });
    const indirectCount = await Referral.countDocuments({ referrer: req.user._id, type: 'indirect' });

    // Calculate active count
    const allDirectReferrals = await Referral.find({ referrer: req.user._id, type: 'direct' }).populate('referred');
    const activeCount = allDirectReferrals.filter((ref) => ref.referred && isUserActive(ref.referred)).length;
    const inactiveCount = directCount - activeCount;

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
        totalReferrals: user.referralStats?.totalCount || 0,
        directReferrals: directCount,
        indirectReferrals: indirectCount,
        activeCount,
        inactiveCount,
        totalEarned: user.referralStats?.totalEarned || 0,
      },
      referralCode: user.referralCode,
    });
  } catch (error) {
    console.error('Get Referrals Error:', error);
    res.status(500).json({ success: false, message: 'Failed to get referrals' });
  }
};

// @desc    Get referral code and share link
// @route   GET /api/referrals/share
// @access  Private
const getShareLink = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    const baseUrl = process.env.APP_URL || 'https://miningapp.com';
    const shareLink = `${baseUrl}/signup?ref=${user.referralCode}`;

    res.status(200).json({
      success: true,
      referralCode: user.referralCode,
      shareLink,
      shareMessage: `Join Mining App and start earning coins! Use my referral code: ${user.referralCode} to get bonus coins. ${shareLink}`,
    });
  } catch (error) {
    console.error('Get Share Link Error:', error);
    res.status(500).json({ success: false, message: 'Failed to get share link' });
  }
};

// @desc    Ping inactive referrals
// @route   POST /api/referrals/ping
// @access  Private
const pingInactiveReferrals = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    // Check if user can ping (once every 12 hours)
    const lastPing = user.referralStats?.lastPingTime;
    if (lastPing) {
      const hoursSinceLastPing = (Date.now() - new Date(lastPing)) / (1000 * 60 * 60);
      if (hoursSinceLastPing < 12) {
        const nextPingTime = new Date(new Date(lastPing).getTime() + 12 * 60 * 60 * 1000);
        return res.status(429).json({
          success: false,
          message: 'You can ping inactive referrals once every 12 hours',
          nextPingAvailable: nextPingTime,
        });
      }
    }

    // Find inactive direct referrals
    const directReferrals = await Referral.find({ referrer: req.user._id, type: 'direct' }).populate('referred');
    const inactiveUsers = directReferrals
      .filter((ref) => ref.referred && !isUserActive(ref.referred))
      .map((ref) => ref.referred);

    if (inactiveUsers.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'All your referrals are active!',
        pingedCount: 0,
      });
    }

    // Send notifications to inactive users
    const notifications = inactiveUsers.map((inactiveUser) => ({
      user: inactiveUser._id,
      type: 'reminder',
      title: 'Your Friend Misses You! 👋',
      message: `${user.name} is wondering where you've been. Start mining again to help each other earn more coins!`,
    }));

    await Notification.insertMany(notifications);

    // Update last ping time
    user.referralStats.lastPingTime = new Date();
    await user.save();

    res.status(200).json({
      success: true,
      message: `Pinged ${inactiveUsers.length} inactive referral(s)`,
      pingedCount: inactiveUsers.length,
      nextPingAvailable: new Date(Date.now() + 12 * 60 * 60 * 1000),
    });
  } catch (error) {
    console.error('Ping Inactive Error:', error);
    res.status(500).json({ success: false, message: 'Failed to ping inactive referrals' });
  }
};

// @desc    Get referral earnings history
// @route   GET /api/referrals/earnings
// @access  Private
const getReferralEarnings = async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);

    const earnings = await Referral.find({ referrer: req.user._id })
      .populate('referred', 'name email avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Referral.countDocuments({ referrer: req.user._id });

    // Calculate total earnings
    const totalEarnings = await Referral.aggregate([
      { $match: { referrer: req.user._id } },
      { $group: { _id: null, total: { $sum: '$coinsEarned' } } },
    ]);

    res.status(200).json({
      success: true,
      earnings: earnings.map((e) => ({
        id: e._id,
        user: e.referred ? {
          name: e.referred.name,
          email: e.referred.email,
          avatar: e.referred.avatar,
        } : null,
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
      totalEarnings: totalEarnings[0]?.total || 0,
    });
  } catch (error) {
    console.error('Get Referral Earnings Error:', error);
    res.status(500).json({ success: false, message: 'Failed to get referral earnings' });
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
        message: 'Invalid referral code',
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
    console.error('Validate Referral Code Error:', error);
    res.status(500).json({ success: false, message: 'Failed to validate code' });
  }
};

module.exports = {
  getReferrals,
  getShareLink,
  pingInactiveReferrals,
  getReferralEarnings,
  validateReferralCode,
};
