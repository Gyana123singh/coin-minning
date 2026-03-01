const express = require("express");
const router = express.Router();

const feedController = require("../controllers/userCommunityFeed");
const { protect } = require("../middleware/auth");

// PUBLIC
router.get("/public", feedController.getPublicFeed);
router.get("/post/:id", feedController.getSinglePublicPost);

// PROTECTED
router.post("/:id/like", protect, feedController.toggleLikeFeedPost);
router.post("/:id/comment", protect, feedController.addFeedComment);

// SHARE
router.post("/:id/share", feedController.incrementShareCount);

module.exports = router;
