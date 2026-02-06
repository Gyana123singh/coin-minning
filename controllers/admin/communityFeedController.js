const Feed = require("../models/Feed");

// ================= ADMIN =================

// Create post
exports.createFeedPost = async (req, res) => {
  try {
    const post = await Feed.create(req.body);
    return res.json({ success: true, data: post });
  } catch (error) {
    console.error("createFeedPost error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create feed post",
    });
  }
};

// Update post
exports.updateFeedPost = async (req, res) => {
  try {
    const post = await Feed.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    return res.json({ success: true, data: post });
  } catch (error) {
    console.error("updateFeedPost error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update feed post",
    });
  }
};

// Delete post
exports.deleteFeedPost = async (req, res) => {
  try {
    const post = await Feed.findByIdAndDelete(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    return res.json({ success: true, message: "Post deleted" });
  } catch (error) {
    console.error("deleteFeedPost error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete feed post",
    });
  }
};

// Hide / Unhide post
exports.toggleFeedPostVisibility = async (req, res) => {
  try {
    const post = await Feed.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    post.isHidden = !post.isHidden;
    await post.save();

    return res.json({ success: true, data: post });
  } catch (error) {
    console.error("toggleFeedPostVisibility error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to toggle post visibility",
    });
  }
};

// Hide / Unhide comment
exports.toggleFeedCommentVisibility = async (req, res) => {
  try {
    const { postId, commentId } = req.params;

    const post = await Feed.findById(postId);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    const comment = post.comments.id(commentId);
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found",
      });
    }

    comment.isHidden = !comment.isHidden;
    await post.save();

    return res.json({ success: true, data: post });
  } catch (error) {
    console.error("toggleFeedCommentVisibility error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to toggle comment visibility",
    });
  }
};

// List all (admin)
exports.getAllFeedPostsAdmin = async (req, res) => {
  try {
    const posts = await Feed.find().sort({ createdAt: -1 });
    return res.json({ success: true, data: posts });
  } catch (error) {
    console.error("getAllFeedPostsAdmin error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch feed posts",
    });
  }
};

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
