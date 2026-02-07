const router = require("express").Router();
const feedController = require("../../controllers/admin/communityFeedController");

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

// USER
router.get("/public", feedController.getPublicFeed);
router.post("/:id/like", feedController.toggleLikeFeedPost);
router.post("/:id/comment", feedController.addFeedComment);

module.exports = router;
