const crypto = require('crypto');

// Generate 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Generate unique referral code
const generateReferralCode = (length = 8) => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return code;
};

// Calculate mining rewards based on user stats
const calculateMiningRewards = (user, settings) => {
  const baseRate = settings.miningRate || 0.25; // coins per hour
  const miningDuration = settings.miningCycleDuration || 24; // hours
  
  // Base earnings
  let totalRate = baseRate;
  
  // Referral bonus (20% boost per active referral)
  const activeReferrals = user.referralStats?.activeCount || 0;
  const referralBoost = activeReferrals * 0.20; // 20% per active referral
  const maxReferralBoost = 1.0; // Max 100% boost from referrals
  totalRate += baseRate * Math.min(referralBoost, maxReferralBoost);
  
  // Level bonus
  const userLevel = user.miningStats?.level || 1;
  const levelBonus = (userLevel - 1) * 0.05; // 5% per level above 1
  totalRate += baseRate * levelBonus;
  
  // Calculate total earnings for the cycle
  const totalEarnings = totalRate * miningDuration;
  
  return {
    baseRate,
    referralBoostRate: baseRate * Math.min(referralBoost, maxReferralBoost),
    levelBoostRate: baseRate * levelBonus,
    totalRate,
    totalEarnings: Math.round(totalEarnings * 100) / 100,
  };
};

// Calculate referral rewards
const calculateReferralReward = (isDirect, settings) => {
  if (isDirect) {
    return settings.directReferralBonus || 50;
  }
  return settings.indirectReferralBonus || 20;
};

// Check if user is considered active (mined in last 48 hours)
const isUserActive = (user) => {
  if (!user.miningStats?.lastMiningTime) return false;
  const hoursSinceLastMining = (Date.now() - new Date(user.miningStats.lastMiningTime)) / (1000 * 60 * 60);
  return hoursSinceLastMining < 48;
};

// Format time remaining for mining
const formatTimeRemaining = (endTime) => {
  const now = new Date();
  const end = new Date(endTime);
  const diff = end - now;
  
  if (diff <= 0) return { hours: 0, minutes: 0, seconds: 0, formatted: '00:00:00' };
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  
  const formatted = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  
  return { hours, minutes, seconds, formatted };
};

// Calculate ownership progress based on KYC requirements
const calculateOwnershipProgress = (user) => {
  const requirements = {
    daysActive: { current: user.ownershipProgress?.daysActive || 0, required: 30 },
    miningSessions: { current: user.ownershipProgress?.miningSessions || 0, required: 20 },
    kycInvited: { current: user.ownershipProgress?.kycInvited ? 1 : 0, required: 1 },
  };
  
  const progress = {
    daysActive: Math.min(100, (requirements.daysActive.current / requirements.daysActive.required) * 100),
    miningSessions: Math.min(100, (requirements.miningSessions.current / requirements.miningSessions.required) * 100),
    kycInvited: requirements.kycInvited.current === 1 ? 100 : 0,
  };
  
  const overallProgress = (progress.daysActive + progress.miningSessions + progress.kycInvited) / 3;
  
  return {
    requirements,
    progress,
    overallProgress: Math.round(overallProgress * 10) / 10,
    isEligibleForKYC: overallProgress >= 100,
  };
};

// Get user tier based on total users (for activity tiers)
const getUserTier = (totalUsers) => {
  if (totalUsers < 10000) {
    return { tier: 1, name: 'Tier 1', range: '1-10K Users' };
  } else if (totalUsers < 100000) {
    return { tier: 2, name: 'Tier 2', range: '10K-100K Users' };
  } else if (totalUsers < 1000000) {
    return { tier: 3, name: 'Tier 3', range: '100K-1M Users' };
  } else {
    return { tier: 4, name: 'Tier 4', range: '1M+ Users' };
  }
};

// Sanitize user object for API response (remove sensitive fields)
const sanitizeUser = (user) => {
  const userObj = user.toObject ? user.toObject() : { ...user };
  delete userObj.password;
  delete userObj.__v;
  return userObj;
};

// Generate random token
const generateToken = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

// Parse pagination params
const parsePagination = (query) => {
  const page = parseInt(query.page) || 1;
  const limit = Math.min(parseInt(query.limit) || 10, 100); // Max 100 items
  const skip = (page - 1) * limit;
  
  return { page, limit, skip };
};

module.exports = {
  generateOTP,
  generateReferralCode,
  calculateMiningRewards,
  calculateReferralReward,
  isUserActive,
  formatTimeRemaining,
  calculateOwnershipProgress,
  getUserTier,
  sanitizeUser,
  generateToken,
  parsePagination,
};
