const PromoCode = require('../../models/PromoCode');
const User = require('../../models/User');

// @desc    Get all promo codes with pagination and filters
// @route   GET /api/admin/settings/promo-codes
// @access  Private/Admin
exports.getPromoCodes = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = '',
      status = 'all',
      rewardType = 'all',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    const query = {};

    // Search filter
    if (search) {
      query.$or = [
        { code: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Status filter
    if (status === 'active') {
      query.status = 'active';
    } else if (status === 'inactive') {
      query.status = 'inactive';
    } else if (status === 'expired') {
      query.$or = [
        { status: 'expired' },
        { endDate: { $lt: new Date() } }
      ];
    }

    // Type filter
    if (rewardType !== 'all') {
      query.rewardType = rewardType;
    }

    // Sort
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [promoCodes, totalCount] = await Promise.all([
      PromoCode.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      PromoCode.countDocuments(query)
    ]);

    // Transform data for frontend compatibility
    const transformedCodes = promoCodes.map(code => ({
      id: code._id,
      _id: code._id,
      code: code.code,
      description: code.description,
      type: code.rewardType, // Map rewardType to type for frontend
      rewardType: code.rewardType,
      value: code.rewardValue,
      rewardValue: code.rewardValue,
      boostDuration: code.boostDuration,
      boostMultiplier: code.boostMultiplier,
      maxUses: code.maxUses,
      usedCount: code.usedCount,
      usesPerUser: code.maxUsesPerUser,
      maxUsesPerUser: code.maxUsesPerUser,
      minPurchase: code.minPurchaseAmount,
      minPurchaseAmount: code.minPurchaseAmount,
      minMiningDays: code.minMiningDays,
      validFrom: code.startDate ? code.startDate.toISOString().split('T')[0] : null,
      validUntil: code.endDate ? code.endDate.toISOString().split('T')[0] : null,
      startDate: code.startDate,
      endDate: code.endDate,
      isActive: code.status === 'active',
      status: code.status,
      targetAudience: code.targetUsers,
      targetUsers: code.targetUsers,
      createdAt: code.createdAt,
      updatedAt: code.updatedAt
    }));

    res.status(200).json({
      success: true,
      promoCodes: transformedCodes,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / parseInt(limit)),
        totalItems: totalCount,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get Promo Codes Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get promo code stats
// @route   GET /api/admin/settings/promo-codes/stats
// @access  Private/Admin
exports.getPromoCodeStats = async (req, res) => {
  try {
    const now = new Date();

    const [
      totalCodes,
      activeCodes,
      expiredCodes,
      totalRedemptions,
      coinsGivenResult
    ] = await Promise.all([
      PromoCode.countDocuments(),
      PromoCode.countDocuments({ 
        status: 'active',
        $or: [
          { endDate: { $gte: now } },
          { endDate: null }
        ]
      }),
      PromoCode.countDocuments({
        $or: [
          { status: 'expired' },
          { endDate: { $lt: now } }
        ]
      }),
      PromoCode.aggregate([
        { $group: { _id: null, total: { $sum: '$usedCount' } } }
      ]),
      PromoCode.aggregate([
        { $match: { rewardType: 'coins' } },
        { $group: { _id: null, total: { $sum: { $multiply: ['$rewardValue', '$usedCount'] } } } }
      ])
    ]);

    // Get redemptions by type
    const redemptionsByType = await PromoCode.aggregate([
      { $group: { 
        _id: '$rewardType', 
        count: { $sum: '$usedCount' },
        codes: { $sum: 1 }
      }}
    ]);

    res.status(200).json({
      success: true,
      stats: {
        totalCodes,
        activeCodes,
        expiredCodes,
        inactiveCodes: totalCodes - activeCodes - expiredCodes,
        totalRedemptions: totalRedemptions[0]?.total || 0,
        coinsGiven: coinsGivenResult[0]?.total || 0,
        redemptionsByType: redemptionsByType.reduce((acc, item) => {
          acc[item._id] = { count: item.count, codes: item.codes };
          return acc;
        }, {})
      }
    });
  } catch (error) {
    console.error('Get Promo Code Stats Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get single promo code
// @route   GET /api/admin/settings/promo-codes/:id
// @access  Private/Admin
exports.getPromoCode = async (req, res) => {
  try {
    const promoCode = await PromoCode.findById(req.params.id).lean();

    if (!promoCode) {
      return res.status(404).json({
        success: false,
        message: 'Promo code not found'
      });
    }

    // Get user usage details
    const usageDetails = await User.find(
      { usedPromoCodes: promoCode.code },
      'name email usedPromoCodes'
    ).limit(50).lean();

    res.status(200).json({
      success: true,
      promoCode: {
        ...promoCode,
        id: promoCode._id,
        type: promoCode.rewardType,
        value: promoCode.rewardValue,
        usesPerUser: promoCode.maxUsesPerUser,
        minPurchase: promoCode.minPurchaseAmount,
        validFrom: promoCode.startDate,
        validUntil: promoCode.endDate,
        isActive: promoCode.status === 'active',
        targetAudience: promoCode.targetUsers
      },
      usageDetails
    });
  } catch (error) {
    console.error('Get Promo Code Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Create promo code
// @route   POST /api/admin/settings/promo-codes
// @access  Private/Admin
exports.createPromoCode = async (req, res) => {
  try {
    const {
      code,
      description,
      type, // Frontend sends 'type', map to 'rewardType'
      rewardType,
      value, // Frontend sends 'value', map to 'rewardValue'
      rewardValue,
      boostDuration,
      boostMultiplier,
      maxUses,
      usesPerUser, // Frontend sends 'usesPerUser', map to 'maxUsesPerUser'
      maxUsesPerUser,
      minPurchase, // Frontend sends 'minPurchase', map to 'minPurchaseAmount'
      minPurchaseAmount,
      minMiningDays,
      validFrom, // Frontend sends 'validFrom', map to 'startDate'
      validUntil, // Frontend sends 'validUntil', map to 'endDate'
      startDate,
      endDate,
      isActive, // Frontend sends 'isActive', map to 'status'
      status,
      targetAudience, // Frontend sends 'targetAudience', map to 'targetUsers'
      targetUsers
    } = req.body;

    // Check if code already exists
    const existingCode = await PromoCode.findOne({ 
      code: code.toUpperCase() 
    });

    if (existingCode) {
      return res.status(400).json({
        success: false,
        message: 'Promo code already exists'
      });
    }

    // Map frontend fields to backend fields
    const finalRewardType = rewardType || type || 'coins';
    const finalRewardValue = rewardValue || value || 0;

    // Create promo code
    const promoCode = await PromoCode.create({
      code: code.toUpperCase(),
      description: description || '',
      rewardType: finalRewardType,
      rewardValue: Number(finalRewardValue),
      boostDuration: finalRewardType === 'boost' ? (boostDuration || 24) : undefined,
      boostMultiplier: finalRewardType === 'boost' ? (boostMultiplier || 1.5) : undefined,
      maxUses: maxUses ? Number(maxUses) : null,
      maxUsesPerUser: maxUsesPerUser || usesPerUser || 1,
      minPurchaseAmount: minPurchaseAmount || minPurchase || 0,
      minMiningDays: minMiningDays || 0,
      startDate: startDate || validFrom || new Date(),
      endDate: endDate || validUntil || null,
      status: status || (isActive !== false ? 'active' : 'inactive'),
      targetUsers: targetUsers || targetAudience || 'all',
      createdBy: req.admin._id
    });

    // Transform for response
    const response = {
      id: promoCode._id,
      _id: promoCode._id,
      code: promoCode.code,
      description: promoCode.description,
      type: promoCode.rewardType,
      rewardType: promoCode.rewardType,
      value: promoCode.rewardValue,
      rewardValue: promoCode.rewardValue,
      maxUses: promoCode.maxUses,
      usedCount: promoCode.usedCount,
      usesPerUser: promoCode.maxUsesPerUser,
      minPurchase: promoCode.minPurchaseAmount,
      validFrom: promoCode.startDate ? promoCode.startDate.toISOString().split('T')[0] : null,
      validUntil: promoCode.endDate ? promoCode.endDate.toISOString().split('T')[0] : null,
      isActive: promoCode.status === 'active',
      status: promoCode.status,
      targetAudience: promoCode.targetUsers,
      createdAt: promoCode.createdAt
    };

    res.status(201).json({
      success: true,
      message: 'Promo code created successfully',
      promoCode: response
    });
  } catch (error) {
    console.error('Create Promo Code Error:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Promo code already exists'
      });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Update promo code
// @route   PUT /api/admin/settings/promo-codes/:id
// @access  Private/Admin
exports.updatePromoCode = async (req, res) => {
  try {
    const {
      code,
      description,
      type,
      rewardType,
      value,
      rewardValue,
      boostDuration,
      boostMultiplier,
      maxUses,
      usesPerUser,
      maxUsesPerUser,
      minPurchase,
      minPurchaseAmount,
      minMiningDays,
      validFrom,
      validUntil,
      startDate,
      endDate,
      isActive,
      status,
      targetAudience,
      targetUsers
    } = req.body;

    const promoCode = await PromoCode.findById(req.params.id);

    if (!promoCode) {
      return res.status(404).json({
        success: false,
        message: 'Promo code not found'
      });
    }

    // If code is being changed, check for duplicates
    if (code && code.toUpperCase() !== promoCode.code) {
      const existingCode = await PromoCode.findOne({
        code: code.toUpperCase(),
        _id: { $ne: req.params.id }
      });

      if (existingCode) {
        return res.status(400).json({
          success: false,
          message: 'Promo code already exists'
        });
      }
      promoCode.code = code.toUpperCase();
    }

    // Update fields
    if (description !== undefined) promoCode.description = description;
    if (rewardType || type) promoCode.rewardType = rewardType || type;
    if (rewardValue !== undefined || value !== undefined) {
      promoCode.rewardValue = Number(rewardValue !== undefined ? rewardValue : value);
    }
    if (boostDuration !== undefined) promoCode.boostDuration = boostDuration;
    if (boostMultiplier !== undefined) promoCode.boostMultiplier = boostMultiplier;
    if (maxUses !== undefined) promoCode.maxUses = maxUses ? Number(maxUses) : null;
    if (maxUsesPerUser !== undefined || usesPerUser !== undefined) {
      promoCode.maxUsesPerUser = maxUsesPerUser || usesPerUser;
    }
    if (minPurchaseAmount !== undefined || minPurchase !== undefined) {
      promoCode.minPurchaseAmount = Number(minPurchaseAmount !== undefined ? minPurchaseAmount : minPurchase);
    }
    if (minMiningDays !== undefined) promoCode.minMiningDays = minMiningDays;
    if (startDate || validFrom) promoCode.startDate = startDate || validFrom;
    if (endDate !== undefined || validUntil !== undefined) {
      promoCode.endDate = endDate || validUntil || null;
    }
    if (status !== undefined) {
      promoCode.status = status;
    } else if (isActive !== undefined) {
      promoCode.status = isActive ? 'active' : 'inactive';
    }
    if (targetUsers || targetAudience) {
      promoCode.targetUsers = targetUsers || targetAudience;
    }

    await promoCode.save();

    // Transform for response
    const response = {
      id: promoCode._id,
      _id: promoCode._id,
      code: promoCode.code,
      description: promoCode.description,
      type: promoCode.rewardType,
      rewardType: promoCode.rewardType,
      value: promoCode.rewardValue,
      rewardValue: promoCode.rewardValue,
      maxUses: promoCode.maxUses,
      usedCount: promoCode.usedCount,
      usesPerUser: promoCode.maxUsesPerUser,
      minPurchase: promoCode.minPurchaseAmount,
      validFrom: promoCode.startDate ? promoCode.startDate.toISOString().split('T')[0] : null,
      validUntil: promoCode.endDate ? promoCode.endDate.toISOString().split('T')[0] : null,
      isActive: promoCode.status === 'active',
      status: promoCode.status,
      targetAudience: promoCode.targetUsers,
      createdAt: promoCode.createdAt,
      updatedAt: promoCode.updatedAt
    };

    res.status(200).json({
      success: true,
      message: 'Promo code updated successfully',
      promoCode: response
    });
  } catch (error) {
    console.error('Update Promo Code Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Delete promo code
// @route   DELETE /api/admin/settings/promo-codes/:id
// @access  Private/Admin
exports.deletePromoCode = async (req, res) => {
  try {
    const promoCode = await PromoCode.findById(req.params.id);

    if (!promoCode) {
      return res.status(404).json({
        success: false,
        message: 'Promo code not found'
      });
    }

    await promoCode.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Promo code deleted successfully'
    });
  } catch (error) {
    console.error('Delete Promo Code Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Toggle promo code status
// @route   PUT /api/admin/settings/promo-codes/:id/toggle-status
// @access  Private/Admin
exports.togglePromoCodeStatus = async (req, res) => {
  try {
    const promoCode = await PromoCode.findById(req.params.id);

    if (!promoCode) {
      return res.status(404).json({
        success: false,
        message: 'Promo code not found'
      });
    }

    promoCode.status = promoCode.status === 'active' ? 'inactive' : 'active';
    await promoCode.save();

    res.status(200).json({
      success: true,
      message: `Promo code ${promoCode.status === 'active' ? 'activated' : 'deactivated'} successfully`,
      promoCode: {
        id: promoCode._id,
        code: promoCode.code,
        isActive: promoCode.status === 'active',
        status: promoCode.status
      }
    });
  } catch (error) {
    console.error('Toggle Promo Code Status Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Bulk delete promo codes
// @route   DELETE /api/admin/settings/promo-codes/bulk
// @access  Private/Admin
exports.bulkDeletePromoCodes = async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide promo code IDs'
      });
    }

    const result = await PromoCode.deleteMany({ _id: { $in: ids } });

    res.status(200).json({
      success: true,
      message: `${result.deletedCount} promo codes deleted successfully`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Bulk Delete Promo Codes Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
