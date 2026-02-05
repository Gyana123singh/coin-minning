const Admin = require('../../models/Admin');

// @desc    Admin login
// @route   POST /api/admin/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate email & password
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password',
      });
    }

    // Check for admin
    const admin = await Admin.findOne({ email }).select('+password');

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // Check if account is locked
    if (admin.isLocked()) {
      const lockTime = Math.ceil((admin.lockUntil - Date.now()) / (1000 * 60));
      return res.status(401).json({
        success: false,
        message: `Account is locked. Try again in ${lockTime} minutes`,
      });
    }

    // Check if account is active
    if (!admin.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated. Contact super admin.',
      });
    }

    // Check password
    const isMatch = await admin.matchPassword(password);

    if (!isMatch) {
      await admin.incrementLoginAttempts();
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // Reset login attempts on successful login
    await Admin.findByIdAndUpdate(admin._id, {
      $set: { loginAttempts: 0, lastLogin: new Date() },
      $unset: { lockUntil: 1 },
    });

    // Create token
    const token = admin.getSignedJwtToken();

    res.status(200).json({
      success: true,
      token,
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        avatar: admin.avatar,
        permissions: admin.permissions,
      },
    });
  } catch (error) {
    console.error('Admin Login Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get current admin
// @route   GET /api/admin/auth/me
// @access  Private/Admin
exports.getMe = async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin._id);

    res.status(200).json({
      success: true,
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        avatar: admin.avatar,
        permissions: admin.permissions,
        lastLogin: admin.lastLogin,
        createdAt: admin.createdAt,
      },
    });
  } catch (error) {
    console.error('Get Me Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Update admin profile
// @route   PUT /api/admin/auth/profile
// @access  Private/Admin
exports.updateProfile = async (req, res) => {
  try {
    const { name, email, avatar } = req.body;

    const admin = await Admin.findByIdAndUpdate(
      req.admin._id,
      { name, email, avatar },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        avatar: admin.avatar,
      },
    });
  } catch (error) {
    console.error('Update Profile Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Change admin password
// @route   PUT /api/admin/auth/password
// @access  Private/Admin
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide current and new password',
      });
    }

    const admin = await Admin.findById(req.admin._id).select('+password');

    // Check current password
    const isMatch = await admin.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect',
      });
    }

    // Update password
    admin.password = newPassword;
    await admin.save();

    res.status(200).json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    console.error('Change Password Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Create new admin (Super admin only)
// @route   POST /api/admin/auth/create
// @access  Private/Super Admin
exports.createAdmin = async (req, res) => {
  try {
    const { name, email, password, role, permissions } = req.body;

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({
        success: false,
        message: 'Admin with this email already exists',
      });
    }

    const admin = await Admin.create({
      name,
      email,
      password,
      role: role || 'admin',
      permissions: permissions || {},
    });

    res.status(201).json({
      success: true,
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        permissions: admin.permissions,
      },
    });
  } catch (error) {
    console.error('Create Admin Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get all admins (Super admin only)
// @route   GET /api/admin/auth/admins
// @access  Private/Super Admin
exports.getAllAdmins = async (req, res) => {
  try {
    const admins = await Admin.find()
      .select('-password')
      .sort('-createdAt');

    res.status(200).json({
      success: true,
      count: admins.length,
      admins,
    });
  } catch (error) {
    console.error('Get All Admins Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Update admin (Super admin only)
// @route   PUT /api/admin/auth/admins/:id
// @access  Private/Super Admin
exports.updateAdmin = async (req, res) => {
  try {
    const { name, email, role, permissions, isActive } = req.body;

    const admin = await Admin.findByIdAndUpdate(
      req.params.id,
      { name, email, role, permissions, isActive },
      { new: true, runValidators: true }
    ).select('-password');

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found',
      });
    }

    res.status(200).json({
      success: true,
      admin,
    });
  } catch (error) {
    console.error('Update Admin Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Delete admin (Super admin only)
// @route   DELETE /api/admin/auth/admins/:id
// @access  Private/Super Admin
exports.deleteAdmin = async (req, res) => {
  try {
    // Prevent self-deletion
    if (req.params.id === req.admin._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete yourself',
      });
    }

    const admin = await Admin.findByIdAndDelete(req.params.id);

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Admin deleted successfully',
    });
  } catch (error) {
    console.error('Delete Admin Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Logout admin
// @route   POST /api/admin/auth/logout
// @access  Private/Admin
exports.logout = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('Logout Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
