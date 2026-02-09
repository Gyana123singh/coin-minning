const Feed = require("../models/CommunityFeed");

// ================= USER APP =================

// Public feed (only visible posts)
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

// Like / Unlike
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

// Add comment
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
