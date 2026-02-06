const router = require("express").Router();
const { feedController } = require("../../controllers/admin/communityFeedController");



// ================= ADMIN =================
router.post("/feed", feedController.createFeedPost);
router.put("/feed/:id", feedController.updateFeedPost);
router.delete("/feed/:id", feedController.deleteFeedPost);
router.patch("/feed/:id/toggle", feedController.toggleFeedPostVisibility);
router.patch(
  "/feed/:postId/comment/:commentId/toggle",

  feedController.toggleFeedCommentVisibility,
);
router.get("/feed", feedController.getAllFeedPostsAdmin);

// ================= USER APP =================
router.get("/feed", feedController.getPublicFeed);
router.post("/feed/:id/like", feedController.toggleLikeFeedPost);
router.post("/feed/:id/comment", feedController.addFeedComment);

module.exports = router;
