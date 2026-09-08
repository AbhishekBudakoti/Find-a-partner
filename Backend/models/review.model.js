const mongoose = require("mongoose");

/**
 * A Review is one participant's rating of the other after a session they both
 * attended. Reviews are anchored to a session (not just to a user) so a rating
 * always corresponds to a meetup that actually happened — sessions only reach
 * "completed" after their scheduled start time.
 */
const reviewSchema = new mongoose.Schema(
  {
    session: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Session",
      required: true,
    },
    reviewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reviewee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    rating: {
      type: Number,
      required: [true, "Rating is required"],
      min: [1, "Rating must be at least 1"],
      max: [5, "Rating cannot exceed 5"],
    },
    comment: {
      type: String,
      trim: true,
      maxlength: [500, "Comment cannot exceed 500 characters"],
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

// One review per person per session — the database is the last line of defence
// against a double-submit slipping past the controller's duplicate check.
reviewSchema.index({ session: 1, reviewer: 1 }, { unique: true });

// Listing the reviews a user has received, newest first.
reviewSchema.index({ reviewee: 1, createdAt: -1 });

const Review = mongoose.model("Review", reviewSchema);

module.exports = Review;
