const Banner = require('../../models/Banner');

// @desc    Get all banners
// @route   GET /api/admin/banners
// @access  Private/Admin
exports.getAllBanners = async (req, res) => {
  try {
    const { includeInactive = 'true' } = req.query;

    const query = {};
    if (includeInactive === 'false') {
      query.status = 'active';
    }

    const banners = await Banner.find(query)
      .populate('createdBy', 'name email')
      .sort('order');

    res.status(200).json({
      success: true,
      banners,
    });
  } catch (error) {
    console.error('Get All Banners Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get active banners for app
// @route   GET /api/admin/banners/active
// @access  Public
exports.getActiveBanners = async (req, res) => {
  try {
    const now = new Date();

    const banners = await Banner.find({
      status: 'active',
      $or: [
        { startDate: null, endDate: null },
        { startDate: { $lte: now }, endDate: null },
        { startDate: null, endDate: { $gte: now } },
        { startDate: { $lte: now }, endDate: { $gte: now } },
      ],
    })
      .select('title description image link linkType')
      .sort('order')
      .limit(5);

    res.status(200).json({
      success: true,
      banners,
    });
  } catch (error) {
    console.error('Get Active Banners Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get single banner
// @route   GET /api/admin/banners/:id
// @access  Private/Admin
exports.getBannerById = async (req, res) => {
  try {
    const banner = await Banner.findById(req.params.id)
      .populate('createdBy', 'name email');

    if (!banner) {
      return res.status(404).json({
        success: false,
        message: 'Banner not found',
      });
    }

    res.status(200).json({
      success: true,
      banner,
    });
  } catch (error) {
    console.error('Get Banner By ID Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Create banner
// @route   POST /api/admin/banners
// @access  Private/Admin
exports.createBanner = async (req, res) => {
  try {
    const {
      title,
      description,
      image,
      link,
      linkType,
      status,
      order,
      targetAudience,
      startDate,
      endDate,
    } = req.body;

    // Check banner limit (max 5 active)
    const activeBannerCount = await Banner.countDocuments({ status: 'active' });
    if (status === 'active' && activeBannerCount >= 5) {
      return res.status(400).json({
        success: false,
        message: 'Maximum 5 active banners allowed',
      });
    }

    const banner = await Banner.create({
      title,
      description,
      image,
      link,
      linkType: linkType || 'none',
      status: status || 'active',
      order: order || 0,
      targetAudience: targetAudience || 'all',
      startDate,
      endDate,
      createdBy: req.admin._id,
    });

    res.status(201).json({
      success: true,
      message: 'Banner created successfully',
      banner,
    });
  } catch (error) {
    console.error('Create Banner Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Update banner
// @route   PUT /api/admin/banners/:id
// @access  Private/Admin
exports.updateBanner = async (req, res) => {
  try {
    const {
      title,
      description,
      image,
      link,
      linkType,
      status,
      order,
      targetAudience,
      startDate,
      endDate,
    } = req.body;

    const banner = await Banner.findByIdAndUpdate(
      req.params.id,
      {
        title,
        description,
        image,
        link,
        linkType,
        status,
        order,
        targetAudience,
        startDate,
        endDate,
      },
      { new: true, runValidators: true }
    );

    if (!banner) {
      return res.status(404).json({
        success: false,
        message: 'Banner not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Banner updated successfully',
      banner,
    });
  } catch (error) {
    console.error('Update Banner Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Delete banner
// @route   DELETE /api/admin/banners/:id
// @access  Private/Admin
exports.deleteBanner = async (req, res) => {
  try {
    const banner = await Banner.findByIdAndDelete(req.params.id);

    if (!banner) {
      return res.status(404).json({
        success: false,
        message: 'Banner not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Banner deleted successfully',
    });
  } catch (error) {
    console.error('Delete Banner Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Toggle banner status
// @route   PUT /api/admin/banners/:id/toggle
// @access  Private/Admin
exports.toggleBannerStatus = async (req, res) => {
  try {
    const banner = await Banner.findById(req.params.id);

    if (!banner) {
      return res.status(404).json({
        success: false,
        message: 'Banner not found',
      });
    }

    // Check banner limit when activating
    if (banner.status === 'inactive') {
      const activeBannerCount = await Banner.countDocuments({ status: 'active' });
      if (activeBannerCount >= 5) {
        return res.status(400).json({
          success: false,
          message: 'Maximum 5 active banners allowed',
        });
      }
    }

    banner.status = banner.status === 'active' ? 'inactive' : 'active';
    await banner.save();

    res.status(200).json({
      success: true,
      message: `Banner ${banner.status === 'active' ? 'activated' : 'deactivated'}`,
      banner,
    });
  } catch (error) {
    console.error('Toggle Banner Status Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Reorder banners
// @route   PUT /api/admin/banners/reorder
// @access  Private/Admin
exports.reorderBanners = async (req, res) => {
  try {
    const { orders } = req.body; // Array of { id, order }

    if (!orders || !Array.isArray(orders)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide order array',
      });
    }

    // Update each banner's order
    await Promise.all(
      orders.map(({ id, order }) =>
        Banner.findByIdAndUpdate(id, { order })
      )
    );

    res.status(200).json({
      success: true,
      message: 'Banners reordered successfully',
    });
  } catch (error) {
    console.error('Reorder Banners Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Record banner view
// @route   POST /api/admin/banners/:id/view
// @access  Public
exports.recordBannerView = async (req, res) => {
  try {
    await Banner.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Record Banner View Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Record banner click
// @route   POST /api/admin/banners/:id/click
// @access  Public
exports.recordBannerClick = async (req, res) => {
  try {
    await Banner.findByIdAndUpdate(req.params.id, { $inc: { clicks: 1 } });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Record Banner Click Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get banner statistics
// @route   GET /api/admin/banners/stats
// @access  Private/Admin
exports.getBannerStats = async (req, res) => {
  try {
    const total = await Banner.countDocuments();
    const active = await Banner.countDocuments({ status: 'active' });
    const inactive = await Banner.countDocuments({ status: 'inactive' });

    // Total views and clicks
    const statsResult = await Banner.aggregate([
      {
        $group: {
          _id: null,
          totalViews: { $sum: '$views' },
          totalClicks: { $sum: '$clicks' },
        },
      },
    ]);

    const totalViews = statsResult[0]?.totalViews || 0;
    const totalClicks = statsResult[0]?.totalClicks || 0;
    const ctr = totalViews > 0 ? ((totalClicks / totalViews) * 100).toFixed(2) : 0;

    res.status(200).json({
      success: true,
      stats: {
        total,
        active,
        inactive,
        totalViews,
        totalClicks,
        ctr: `${ctr}%`,
      },
    });
  } catch (error) {
    console.error('Get Banner Stats Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
