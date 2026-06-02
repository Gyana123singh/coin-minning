const router = require("express").Router();
const feedController = require("../../controllers/admin/adminCommunityFeedController");
const { upload } = require("../../middleware/upload");

// ADMIN
router.post("/", upload.single("image"), feedController.createFeedPost);
router.put("/:id", upload.single("image"), feedController.updateFeedPost);
router.delete("/:id", feedController.deleteFeedPost);
router.patch("/:id/toggle", feedController.toggleFeedPostVisibility);
router.patch(
  "/:postId/comment/:commentId/toggle",
  feedController.toggleFeedCommentVisibility,
);
router.get("/", feedController.getAllFeedPostsAdmin);

module.exports = router;
