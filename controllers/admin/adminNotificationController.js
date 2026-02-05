const Notification = require('../../models/Notification');
const User = require('../../models/User');

// @desc    Send notification to single user
// @route   POST /api/admin/notifications/send
// @access  Private/Admin
exports.sendNotification = async (req, res) => {
  try {
    const { userId, title, message, type, data } = req.body;

    if (!userId || !title || !message) {
      return res.status(400).json({
        success: false,
        message: 'Please provide userId, title, and message',
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const notification = await Notification.create({
      user: userId,
      title,
      message,
      type: type || 'system',
      data,
    });

    res.status(201).json({
      success: true,
      message: 'Notification sent successfully',
      notification,
    });
  } catch (error) {
    console.error('Send Notification Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Send bulk notifications
// @route   POST /api/admin/notifications/bulk
// @access  Private/Admin
exports.sendBulkNotification = async (req, res) => {
  try {
    const { userIds, title, message, type, data, filter } = req.body;

    if (!title || !message) {
      return res.status(400).json({
        success: false,
        message: 'Please provide title and message',
      });
    }

    let targetUsers = [];

    if (userIds && userIds.length > 0) {
      // Send to specific users
      targetUsers = userIds;
    } else if (filter) {
      // Filter users based on criteria
      const query = {};
      
      if (filter.status) query.status = filter.status;
      if (filter.kycStatus) query.kycStatus = filter.kycStatus;
      if (filter.hasReferrals) query['referralStats.totalCount'] = { $gt: 0 };
      if (filter.minMined) query['miningStats.totalMined'] = { $gte: filter.minMined };

      const users = await User.find(query).select('_id');
      targetUsers = users.map(u => u._id);
    } else {
      // Send to all active users
      const users = await User.find({ status: 'active' }).select('_id');
      targetUsers = users.map(u => u._id);
    }

    if (targetUsers.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No users found matching the criteria',
      });
    }

    // Create notifications in bulk
    const notifications = targetUsers.map(userId => ({
      user: userId,
      title,
      message,
      type: type || 'system',
      data,
    }));

    await Notification.insertMany(notifications);

    res.status(201).json({
      success: true,
      message: `Notification sent to ${targetUsers.length} users`,
      count: targetUsers.length,
    });
  } catch (error) {
    console.error('Send Bulk Notification Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get all notifications
// @route   GET /api/admin/notifications
// @access  Private/Admin
exports.getAllNotifications = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      type,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc' 
    } = req.query;

    const query = {};

    if (type && type !== 'all') {
      query.type = type;
    }

    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const notifications = await Notification.find(query)
      .populate('user', 'name email avatar')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Notification.countDocuments(query);

    res.status(200).json({
      success: true,
      notifications,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total,
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    console.error('Get All Notifications Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Delete notification
// @route   DELETE /api/admin/notifications/:id
// @access  Private/Admin
exports.deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findByIdAndDelete(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Notification deleted',
    });
  } catch (error) {
    console.error('Delete Notification Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Delete all notifications for a user
// @route   DELETE /api/admin/notifications/user/:userId
// @access  Private/Admin
exports.deleteUserNotifications = async (req, res) => {
  try {
    const result = await Notification.deleteMany({ user: req.params.userId });

    res.status(200).json({
      success: true,
      message: `Deleted ${result.deletedCount} notifications`,
    });
  } catch (error) {
    console.error('Delete User Notifications Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get notification statistics
// @route   GET /api/admin/notifications/stats
// @access  Private/Admin
exports.getNotificationStats = async (req, res) => {
  try {
    const total = await Notification.countDocuments();
    const unread = await Notification.countDocuments({ read: false });

    // By type
    const byType = await Notification.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 } } },
    ]);

    // Today's notifications
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayCount = await Notification.countDocuments({
      createdAt: { $gte: today },
    });

    res.status(200).json({
      success: true,
      stats: {
        total,
        unread,
        todayCount,
        byType: byType.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
      },
    });
  } catch (error) {
    console.error('Notification Stats Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get notification templates
// @route   GET /api/admin/notifications/templates
// @access  Private/Admin
exports.getNotificationTemplates = async (req, res) => {
  try {
    // Predefined templates for quick sending
    const templates = [
      {
        id: 'mining_reminder',
        name: 'Mining Reminder',
        title: 'Time to Mine!',
        message: 'Don\'t forget to start your mining session today to earn coins!',
        type: 'mining',
      },
      {
        id: 'kyc_reminder',
        name: 'KYC Reminder',
        title: 'Complete Your KYC',
        message: 'Complete your KYC verification to unlock all features and start withdrawing.',
        type: 'kyc',
      },
      {
        id: 'referral_promo',
        name: 'Referral Promotion',
        title: 'Invite & Earn!',
        message: 'Invite your friends and earn bonus coins for every successful referral!',
        type: 'referral',
      },
      {
        id: 'new_feature',
        name: 'New Feature',
        title: 'New Feature Alert!',
        message: 'Check out our latest feature update in the app!',
        type: 'system',
      },
      {
        id: 'maintenance',
        name: 'Maintenance Notice',
        title: 'Scheduled Maintenance',
        message: 'The app will be under maintenance. We\'ll be back shortly!',
        type: 'system',
      },
    ];

    res.status(200).json({
      success: true,
      templates,
    });
  } catch (error) {
    console.error('Get Templates Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
