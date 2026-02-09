const express = require("express");
const router = express.Router();

const feedController = require("../controllers/userCommunityFeed");
const { protect } = require("../middleware/auth");

// Protected routes
router.use(protect);
// PUBLIC
router.get("/public", feedController.getPublicFeed);

// PROTECTED (login required)
router.post("/:id/like", feedController.toggleLikeFeedPost);
router.post("/:id/comment", feedController.addFeedComment);

module.exports = router;
