const router = require("express").Router();
const feedController = require("../../controllers/admin/adminCommunityFeedController");

// ADMIN
router.post("/", feedController.createFeedPost);
router.put("/:id", feedController.updateFeedPost);
router.delete("/:id", feedController.deleteFeedPost);
router.patch("/:id/toggle", feedController.toggleFeedPostVisibility);
router.patch(
  "/:postId/comment/:commentId/toggle",
  feedController.toggleFeedCommentVisibility,
);
router.get("/", feedController.getAllFeedPostsAdmin);

module.exports = router;
