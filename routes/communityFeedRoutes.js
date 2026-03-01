const express = require("express");
const router = express.Router();

const feedController = require("../controllers/userCommunityFeed");
const { protect } = require("../middleware/auth");

// PUBLIC
router.get("/public", feedController.getPublicFeed);

// PROTECTED (login required)
router.post("/:id/like", protect, feedController.toggleLikeFeedPost);
router.post("/:id/comment", protect, feedController.addFeedComment);

module.exports = router;
