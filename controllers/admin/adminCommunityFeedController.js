const Feed = require("../../models/CommunityFeed");

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

