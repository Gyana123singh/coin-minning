const KYC = require('../models/KYC');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { calculateOwnershipProgress } = require('../utils/helpers');

// @desc    Get KYC status and checklist
// @route   GET /api/kyc/status
// @access  Private
const getKYCStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const ownershipProgress = calculateOwnershipProgress(user);

    // Get existing KYC submission
    const kyc = await KYC.findOne({ user: req.user._id }).sort({ createdAt: -1 });

    const checklist = [
      {
        id: 'ownership',
        title: 'Complete ownership information over 30 days',
        description: 'Be an active member for at least 30 days',
        progress: ownershipProgress.progress.daysActive,
        current: ownershipProgress.requirements.daysActive.current,
        required: ownershipProgress.requirements.daysActive.required,
        completed: ownershipProgress.progress.daysActive >= 100,
      },
      {
        id: 'mining',
        title: 'Complete mining for at least 20 sessions',
        description: 'Start and complete 20 mining cycles',
        progress: ownershipProgress.progress.miningSessions,
        current: ownershipProgress.requirements.miningSessions.current,
        required: ownershipProgress.requirements.miningSessions.required,
        completed: ownershipProgress.progress.miningSessions >= 100,
      },
      {
        id: 'kyc_invite',
        title: 'Received invitation to join KYC program',
        description: 'Complete the above requirements to receive KYC invitation',
        progress: ownershipProgress.progress.kycInvited,
        current: ownershipProgress.requirements.kycInvited.current,
        required: ownershipProgress.requirements.kycInvited.required,
        completed: ownershipProgress.progress.kycInvited >= 100,
      },
    ];

    res.status(200).json({
      success: true,
      kycStatus: user.kycStatus,
      isEligible: ownershipProgress.isEligibleForKYC,
      overallProgress: ownershipProgress.overallProgress,
      checklist,
      submission: kyc ? {
        id: kyc._id,
        status: kyc.status,
        submittedAt: kyc.createdAt,
        reviewedAt: kyc.reviewedAt,
        rejectionReason: kyc.rejectionReason,
      } : null,
    });
  } catch (error) {
    console.error('Get KYC Status Error:', error);
    res.status(500).json({ success: false, message: 'Failed to get KYC status' });
  }
};

// @desc    Submit KYC documents
// @route   POST /api/kyc/submit
// @access  Private
const submitKYC = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const ownershipProgress = calculateOwnershipProgress(user);

    // Check eligibility
    if (!ownershipProgress.isEligibleForKYC) {
      return res.status(400).json({
        success: false,
        message: 'You are not eligible for KYC yet. Complete all requirements first.',
        progress: ownershipProgress,
      });
    }

    // Check if already has pending/approved KYC
    const existingKYC = await KYC.findOne({
      user: req.user._id,
      status: { $in: ['pending', 'approved'] },
    });

    if (existingKYC) {
      return res.status(400).json({
        success: false,
        message: existingKYC.status === 'pending' 
          ? 'You already have a pending KYC submission' 
          : 'Your KYC is already approved',
      });
    }

    const {
      fullName,
      dateOfBirth,
      address,
      city,
      country,
      postalCode,
      documentType,
    } = req.body;

    // Validate required fields
    if (!fullName || !dateOfBirth || !address || !city || !country || !documentType) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required information',
      });
    }

    // Check for uploaded files
    if (!req.files || !req.files.documentFront || !req.files.selfie) {
      return res.status(400).json({
        success: false,
        message: 'Please upload document front image and selfie',
      });
    }

    const kyc = await KYC.create({
      user: req.user._id,
      personalInfo: {
        fullName,
        dateOfBirth,
        address,
        city,
        country,
        postalCode,
      },
      document: {
        type: documentType,
        frontImage: req.files.documentFront[0].path,
        backImage: req.files.documentBack ? req.files.documentBack[0].path : null,
      },
      selfie: req.files.selfie[0].path,
    });

    // Update user KYC status
    user.kycStatus = 'pending';
    await user.save();

    // Create notification
    await Notification.create({
      user: req.user._id,
      type: 'kyc',
      title: 'KYC Submitted',
      message: 'Your KYC documents have been submitted for review. We will notify you once verified.',
    });

    res.status(201).json({
      success: true,
      message: 'KYC documents submitted successfully',
      kyc: {
        id: kyc._id,
        status: kyc.status,
        submittedAt: kyc.createdAt,
      },
    });
  } catch (error) {
    console.error('Submit KYC Error:', error);
    res.status(500).json({ success: false, message: 'Failed to submit KYC' });
  }
};

// @desc    Get KYC submission details
// @route   GET /api/kyc/:id
// @access  Private
const getKYCDetails = async (req, res) => {
  try {
    const kyc = await KYC.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!kyc) {
      return res.status(404).json({
        success: false,
        message: 'KYC submission not found',
      });
    }

    res.status(200).json({
      success: true,
      kyc: {
        id: kyc._id,
        status: kyc.status,
        personalInfo: kyc.personalInfo,
        documentType: kyc.document.type,
        submittedAt: kyc.createdAt,
        reviewedAt: kyc.reviewedAt,
        rejectionReason: kyc.rejectionReason,
      },
    });
  } catch (error) {
    console.error('Get KYC Details Error:', error);
    res.status(500).json({ success: false, message: 'Failed to get KYC details' });
  }
};

// @desc    Resubmit KYC after rejection
// @route   PUT /api/kyc/resubmit
// @access  Private
const resubmitKYC = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    // Find rejected KYC
    const existingKYC = await KYC.findOne({
      user: req.user._id,
      status: 'rejected',
    }).sort({ createdAt: -1 });

    if (!existingKYC) {
      return res.status(400).json({
        success: false,
        message: 'No rejected KYC submission found',
      });
    }

    const {
      fullName,
      dateOfBirth,
      address,
      city,
      country,
      postalCode,
      documentType,
    } = req.body;

    // Update KYC with new data
    existingKYC.personalInfo = {
      fullName: fullName || existingKYC.personalInfo.fullName,
      dateOfBirth: dateOfBirth || existingKYC.personalInfo.dateOfBirth,
      address: address || existingKYC.personalInfo.address,
      city: city || existingKYC.personalInfo.city,
      country: country || existingKYC.personalInfo.country,
      postalCode: postalCode || existingKYC.personalInfo.postalCode,
    };

    if (documentType) {
      existingKYC.document.type = documentType;
    }

    // Update images if provided
    if (req.files) {
      if (req.files.documentFront) {
        existingKYC.document.frontImage = req.files.documentFront[0].path;
      }
      if (req.files.documentBack) {
        existingKYC.document.backImage = req.files.documentBack[0].path;
      }
      if (req.files.selfie) {
        existingKYC.selfie = req.files.selfie[0].path;
      }
    }

    existingKYC.status = 'pending';
    existingKYC.rejectionReason = null;
    existingKYC.reviewedAt = null;
    await existingKYC.save();

    // Update user status
    user.kycStatus = 'pending';
    await user.save();

    res.status(200).json({
      success: true,
      message: 'KYC resubmitted successfully',
      kyc: {
        id: existingKYC._id,
        status: existingKYC.status,
      },
    });
  } catch (error) {
    console.error('Resubmit KYC Error:', error);
    res.status(500).json({ success: false, message: 'Failed to resubmit KYC' });
  }
};

module.exports = {
  getKYCStatus,
  submitKYC,
  getKYCDetails,
  resubmitKYC,
};
