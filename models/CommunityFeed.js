const mongoose = require("mongoose");

const CommentSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    text: String,
    isHidden: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const FeedSchema = new mongoose.Schema(
  {
    title: String,
    content: String,
    imageUrl: String,
    tag: String,
    authorType: { type: String, default: "admin" },

    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    comments: [CommentSchema],

    isHidden: { type: Boolean, default: false }, // admin can hide post
  },
  { timestamps: true }
);

module.exports = mongoose.model("Feed", FeedSchema);
