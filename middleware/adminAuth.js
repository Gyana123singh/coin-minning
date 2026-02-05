const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

// Protect admin routes
exports.protectAdmin = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route',
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if it's an admin token
    if (!decoded.isAdmin) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized as admin',
      });
    }

    const admin = await Admin.findById(decoded.id);

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Admin not found',
      });
    }

    if (!admin.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Admin account is deactivated',
      });
    }

    req.admin = admin;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route',
    });
  }
};

// Restrict to specific roles
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.admin.role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to perform this action',
      });
    }
    next();
  };
};

// Check specific permission
exports.checkPermission = (permission) => {
  return (req, res, next) => {
    // Super admin has all permissions
    if (req.admin.role === 'super_admin') {
      return next();
    }

    if (!req.admin.permissions[permission]) {
      return res.status(403).json({
        success: false,
        message: `You do not have permission to access ${permission}`,
      });
    }
    next();
  };
};
