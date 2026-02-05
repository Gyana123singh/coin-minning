const KYC = require('../../models/KYC');
const User = require('../../models/User');
const Notification = require('../../models/Notification');

// @desc    Get all KYC requests
// @route   GET /api/admin/kyc
// @access  Private/Admin
exports.getAllKYC = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status, 
      documentType,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc' 
    } = req.query;

    // Build query
    const query = {};

    if (status && status !== 'all') {
      query.status = status;
    }

    if (documentType) {
      query['document.type'] = documentType;
    }

    // Build sort
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query with pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    let kycRequests = await KYC.find(query)
      .populate('user', 'name email phone avatar')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    // Filter by search if provided
    if (search) {
      kycRequests = kycRequests.filter(kyc => 
        kyc.user?.name?.toLowerCase().includes(search.toLowerCase()) ||
        kyc.user?.email?.toLowerCase().includes(search.toLowerCase()) ||
        kyc.document?.number?.toLowerCase().includes(search.toLowerCase())
      );
    }

    const total = await KYC.countDocuments(query);

    res.status(200).json({
      success: true,
      kycRequests,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total,
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    console.error('Get All KYC Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get KYC statistics
// @route   GET /api/admin/kyc/stats
// @access  Private/Admin
exports.getKYCStats = async (req, res) => {
  try {
    const total = await KYC.countDocuments();
    const pending = await KYC.countDocuments({ status: 'pending' });
    const approved = await KYC.countDocuments({ status: 'approved' });
    const rejected = await KYC.countDocuments({ status: 'rejected' });

    // Today's stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todaySubmissions = await KYC.countDocuments({
      createdAt: { $gte: today },
    });
    const todayApproved = await KYC.countDocuments({
      status: 'approved',
      updatedAt: { $gte: today },
    });

    res.status(200).json({
      success: true,
      stats: {
        total,
        pending,
        approved,
        rejected,
        todaySubmissions,
        todayApproved,
      },
    });
  } catch (error) {
    console.error('KYC Stats Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get single KYC detail
// @route   GET /api/admin/kyc/:id
// @access  Private/Admin
exports.getKYCById = async (req, res) => {
  try {
    const kyc = await KYC.findById(req.params.id)
      .populate('user', 'name email phone avatar status createdAt');

    if (!kyc) {
      return res.status(404).json({
        success: false,
        message: 'KYC request not found',
      });
    }

    res.status(200).json({
      success: true,
      kyc,
    });
  } catch (error) {
    console.error('Get KYC By ID Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Approve KYC
// @route   PUT /api/admin/kyc/:id/approve
// @access  Private/Admin
exports.approveKYC = async (req, res) => {
  try {
    const { notes } = req.body;

    const kyc = await KYC.findById(req.params.id);

    if (!kyc) {
      return res.status(404).json({
        success: false,
        message: 'KYC request not found',
      });
    }

    if (kyc.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'KYC has already been processed',
      });
    }

    // Update KYC status
    kyc.status = 'approved';
    kyc.reviewedBy = req.admin._id;
    kyc.reviewedAt = new Date();
    if (notes) kyc.adminNotes = notes;
    await kyc.save();

    // Update user's KYC status
    await User.findByIdAndUpdate(kyc.user, { kycStatus: 'approved' });

    // Notify user
    await Notification.create({
      user: kyc.user,
      title: 'KYC Approved',
      message: 'Congratulations! Your KYC verification has been approved.',
      type: 'kyc',
    });

    res.status(200).json({
      success: true,
      message: 'KYC approved successfully',
      kyc,
    });
  } catch (error) {
    console.error('Approve KYC Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Reject KYC
// @route   PUT /api/admin/kyc/:id/reject
// @access  Private/Admin
exports.rejectKYC = async (req, res) => {
  try {
    const { reason, notes } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a rejection reason',
      });
    }

    const kyc = await KYC.findById(req.params.id);

    if (!kyc) {
      return res.status(404).json({
        success: false,
        message: 'KYC request not found',
      });
    }

    if (kyc.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'KYC has already been processed',
      });
    }

    // Update KYC status
    kyc.status = 'rejected';
    kyc.rejectionReason = reason;
    kyc.reviewedBy = req.admin._id;
    kyc.reviewedAt = new Date();
    if (notes) kyc.adminNotes = notes;
    await kyc.save();

    // Update user's KYC status
    await User.findByIdAndUpdate(kyc.user, { kycStatus: 'rejected' });

    // Notify user
    await Notification.create({
      user: kyc.user,
      title: 'KYC Rejected',
      message: `Your KYC verification was rejected. Reason: ${reason}`,
      type: 'kyc',
    });

    res.status(200).json({
      success: true,
      message: 'KYC rejected',
      kyc,
    });
  } catch (error) {
    console.error('Reject KYC Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Export KYC data
// @route   GET /api/admin/kyc/export
// @access  Private/Admin
exports.exportKYC = async (req, res) => {
  try {
    const { status, startDate, endDate } = req.query;

    const query = {};
    if (status && status !== 'all') query.status = status;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const kycRequests = await KYC.find(query)
      .populate('user', 'name email phone')
      .lean();

    const exportData = kycRequests.map(kyc => ({
      UserName: kyc.user?.name || 'N/A',
      Email: kyc.user?.email || 'N/A',
      Phone: kyc.user?.phone || 'N/A',
      DocumentType: kyc.document?.type || 'N/A',
      DocumentNumber: kyc.document?.number || 'N/A',
      Status: kyc.status,
      SubmittedAt: kyc.createdAt,
      ReviewedAt: kyc.reviewedAt || 'N/A',
    }));

    res.status(200).json({
      success: true,
      data: exportData,
    });
  } catch (error) {
    console.error('Export KYC Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
