const Feed = require("../models/CommunityFeed");

// ================= PUBLIC FEED =================

// Get all visible posts
exports.getPublicFeed = async (req, res) => {
  try {
    const posts = await Feed.find({ isHidden: false }).sort({ createdAt: -1 });

    return res.json({ success: true, data: posts });
  } catch (error) {
    console.error("getPublicFeed error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch public feed",
    });
  }
};

// Get single public post (for share link)
exports.getSinglePublicPost = async (req, res) => {
  try {
    const post = await Feed.findOne({
      _id: req.params.id,
      isHidden: false,
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    return res.json({ success: true, data: post });
  } catch (error) {
    console.error("getSinglePublicPost error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch post",
    });
  }
};

// ================= LIKE / UNLIKE =================

exports.toggleLikeFeedPost = async (req, res) => {
  try {
    const post = await Feed.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    const uid = req.user._id;

    if (post.likes.includes(uid)) {
      post.likes.pull(uid);
    } else {
      post.likes.push(uid);
    }

    await post.save();

    return res.json({
      success: true,
      likes: post.likes.length,
      data: post,
    });
  } catch (error) {
    console.error("toggleLikeFeedPost error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to like/unlike post",
    });
  }
};

// ================= COMMENT =================

exports.addFeedComment = async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({
        success: false,
        message: "Comment text is required",
      });
    }

    const post = await Feed.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    post.comments.push({
      userId: req.user._id,
      text: text.trim(),
    });

    await post.save();

    return res.json({ success: true, data: post });
  } catch (error) {
    console.error("addFeedComment error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to add comment",
    });
  }
};

// ================= SHARE =================

exports.incrementShareCount = async (req, res) => {
  try {
    const post = await Feed.findByIdAndUpdate(
      req.params.id,
      { $inc: { shares: 1 } },
      { new: true },
    );

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    return res.json({
      success: true,
      shares: post.shares,
    });
  } catch (error) {
    console.error("incrementShareCount error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update share count",
    });
  }
};
