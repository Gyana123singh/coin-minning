const User = require('../../models/User');
const Wallet = require('../../models/Wallet');
const MiningSession = require('../../models/MiningSession');
const Transaction = require('../../models/Transaction');
const Notification = require('../../models/Notification');

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private/Admin
exports.getAllUsers = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search, 
      status, 
      kycStatus,
      sortBy = 'createdAt',
      sortOrder = 'desc' 
    } = req.query;

    // Build query
    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { referralCode: { $regex: search, $options: 'i' } },
      ];
    }

    if (status) {
      query.status = status;
    }

    if (kycStatus) {
      query.kycStatus = kycStatus;
    }

    // Build sort
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query with pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const users = await User.find(query)
      .select('-password -referralChain')
      .populate('referredBy', 'name email')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    // Fetch wallet balances for all users
    const userIds = users.map(u => u._id);
    const wallets = await Wallet.find({ user: { $in: userIds } });
    const walletMap = {};
    wallets.forEach(w => {
      walletMap[w.user.toString()] = w.coinBalance || 0;
    });

    // Add coinBalance to each user
    const usersWithBalance = users.map(user => {
      const userObj = user.toObject();
      userObj.coinBalance = walletMap[user._id.toString()] || 0;
      return userObj;
    });

    const total = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      users: usersWithBalance,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total,
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    console.error('Get All Users Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get single user details
// @route   GET /api/admin/users/:id
// @access  Private/Admin
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('referredBy', 'name email referralCode')
      .populate('referralStats.directReferrals', 'name email status createdAt')
      .populate('referralStats.indirectReferrals', 'name email status createdAt');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Get wallet info
    const wallet = await Wallet.findOne({ user: user._id });

    // Get recent mining sessions
    const recentMiningSessions = await MiningSession.find({ user: user._id })
      .sort('-startTime')
      .limit(5);

    // Get recent transactions
    const recentTransactions = await Transaction.find({ user: user._id })
      .sort('-createdAt')
      .limit(10);

    res.status(200).json({
      success: true,
      user,
      wallet,
      recentMiningSessions,
      recentTransactions,
    });
  } catch (error) {
    console.error('Get User By ID Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Update user
// @route   PUT /api/admin/users/:id
// @access  Private/Admin
exports.updateUser = async (req, res) => {
  try {
    const { name, email, phone, status, kycStatus } = req.body;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { name, email, phone, status, kycStatus },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error('Update User Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Ban/Suspend user
// @route   PUT /api/admin/users/:id/ban
// @access  Private/Admin
exports.banUser = async (req, res) => {
  try {
    const { reason } = req.body;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { status: 'suspended' },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Send notification to user
    await Notification.create({
      user: user._id,
      title: 'Account Suspended',
      message: reason || 'Your account has been suspended. Please contact support.',
      type: 'system',
    });

    res.status(200).json({
      success: true,
      message: 'User has been suspended',
      user,
    });
  } catch (error) {
    console.error('Ban User Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Unban user
// @route   PUT /api/admin/users/:id/unban
// @access  Private/Admin
exports.unbanUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { status: 'active' },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Send notification to user
    await Notification.create({
      user: user._id,
      title: 'Account Reactivated',
      message: 'Your account has been reactivated. Welcome back!',
      type: 'system',
    });

    res.status(200).json({
      success: true,
      message: 'User has been reactivated',
      user,
    });
  } catch (error) {
    console.error('Unban User Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Delete user
// @route   DELETE /api/admin/users/:id
// @access  Private/Admin
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Hard delete - actually remove the user and related data
    // Delete user's wallet
    await Wallet.deleteMany({ user: user._id });
    
    // Delete user's mining sessions
    await MiningSession.deleteMany({ user: user._id });
    
    // Delete user's transactions
    await Transaction.deleteMany({ user: user._id });
    
    // Delete user's notifications
    await Notification.deleteMany({ user: user._id });
    
    // Delete the user
    await User.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'User has been permanently deleted',
    });
  } catch (error) {
    console.error('Delete User Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Add coins to user
// @route   POST /api/admin/users/:id/add-coins
// @access  Private/Admin
exports.addCoins = async (req, res) => {
  try {
    const { amount, reason } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid amount",
      });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    let wallet = await Wallet.findOne({ user: user._id });
    if (!wallet) {
      wallet = await Wallet.create({ user: user._id });
    }

    // ✅ ADD COINS PROPERLY (to purchase wallet)
    await wallet.addPurchaseCoins(amount);

    // Create transaction record
    await Transaction.create({
      user: user._id,
      type: "bonus",
      amount,
      coins: amount,
      status: "completed",
      description: reason || "Admin added coins",
      metadata: { walletType: "purchase" },
    });

    // Notify user
    await Notification.create({
      user: user._id,
      title: "Coins Added",
      message: `${amount} coins have been added to your wallet. ${reason || ""}`,
      type: "reward",
    });

    res.status(200).json({
      success: true,
      message: `${amount} coins added successfully`,
      newBalance: wallet.purchaseBalance,
    });
  } catch (error) {
    console.error("Add Coins Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};


// @desc    Deduct coins from user
// @route   POST /api/admin/users/:id/deduct-coins
// @access  Private/Admin
exports.deductCoins = async (req, res) => {
  try {
    const { amount, reason } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid amount",
      });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const wallet = await Wallet.findOne({ user: user._id });
    if (!wallet || wallet.availablePurchaseCoins < amount) {
      return res.status(400).json({
        success: false,
        message: "Insufficient balance",
      });
    }

    // ✅ DEDUCT PROPERLY from purchase wallet
    await wallet.deductPurchaseCoins(amount);

    // Create transaction record
    await Transaction.create({
      user: user._id,
      type: "withdrawal",
      amount: -amount,
      coins: -amount,
      status: "completed",
      description: reason || "Admin deducted coins",
      metadata: { walletType: "purchase" },
    });

    // Notify user
    await Notification.create({
      user: user._id,
      title: "Coins Deducted",
      message: `${amount} coins have been deducted from your wallet. ${reason || ""}`,
      type: "system",
    });

    res.status(200).json({
      success: true,
      message: `${amount} coins deducted successfully`,
      newBalance: wallet.purchaseBalance,
    });
  } catch (error) {
    console.error("Deduct Coins Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};


// @desc    Get user statistics
// @route   GET /api/admin/users/stats
// @access  Private/Admin
exports.getUserStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ status: 'active' });
    const suspendedUsers = await User.countDocuments({ status: 'suspended' });
    const kycPending = await User.countDocuments({ kycStatus: 'pending' });
    const kycApproved = await User.countDocuments({ kycStatus: 'approved' });

    // Users by registration date
    const last7Days = new Date();
    last7Days.setDate(last7Days.getDate() - 7);
    const newUsersThisWeek = await User.countDocuments({
      createdAt: { $gte: last7Days },
    });

    res.status(200).json({
      success: true,
      stats: {
        total: totalUsers,
        active: activeUsers,
        suspended: suspendedUsers,
        kycPending,
        kycApproved,
        newThisWeek: newUsersThisWeek,
      },
    });
  } catch (error) {
    console.error('User Stats Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Export users data
// @route   GET /api/admin/users/export
// @access  Private/Admin
exports.exportUsers = async (req, res) => {
  try {
    const { status, kycStatus, startDate, endDate } = req.query;

    const query = {};
    if (status) query.status = status;
    if (kycStatus) query.kycStatus = kycStatus;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const users = await User.find(query)
      .select('name email phone status kycStatus referralCode miningStats referralStats createdAt')
      .lean();

    // Transform for export
    const exportData = users.map(user => ({
      Name: user.name,
      Email: user.email,
      Phone: user.phone || 'N/A',
      Status: user.status,
      KYC: user.kycStatus,
      ReferralCode: user.referralCode,
      TotalMined: user.miningStats?.totalMined || 0,
      TotalReferrals: user.referralStats?.totalCount || 0,
      JoinedAt: user.createdAt,
    }));

    res.status(200).json({
      success: true,
      data: exportData,
    });
  } catch (error) {
    console.error('Export Users Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Create new user (admin)
// @route   POST /api/admin/users
// @access  Private/Admin
exports.createUser = async (req, res) => {
  try {
    const { name, email, phone, password, status } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Name, email, and password are required' 
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: 'User with this email already exists' 
      });
    }

    // Generate unique referral code
    const { generateReferralCode } = require('../../utils/helpers');
    let referralCode = generateReferralCode();
    while (await User.findOne({ referralCode })) {
      referralCode = generateReferralCode();
    }

    // Create user
    const user = await User.create({
      name,
      email,
      phone: phone || '',
      password,
      referralCode,
      status: status || 'active',
      isEmailVerified: true,
      'miningStats.totalCoins': 100, // Signup bonus
    });

    // Create wallet for user
    await Wallet.create({ user: user._id });

    // Create welcome notification
    await Notification.create({
      user: user._id,
      title: 'Welcome to Mining App!',
      message: 'Your account has been created by admin. Start mining to earn coins!',
      type: 'system',
    });

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        status: user.status,
        referralCode: user.referralCode,
      },
    });
  } catch (error) {
    console.error('Create User Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
