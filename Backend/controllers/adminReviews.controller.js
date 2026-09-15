const mongoose = require("mongoose");

const Review = require("../models/review.model");
const { successResponse } = require("../utils/response");
const { recalculateUserRating } = require("../services/rating.service");

const httpError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

/**
 * @desc    List every review on the platform (?minRating=&maxRating=&page=&limit=)
 * @route   GET /api/admin/reviews
 * @access  Admin
 */
const getReviews = async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));

  const filter = {};
  if (req.query.maxRating !== undefined) {
    const max = Number(req.query.maxRating);
    if (!Number.isInteger(max) || max < 1 || max > 5) {
      throw httpError("maxRating must be a whole number from 1 to 5", 400);
    }
    // Surfaces low-rated / potentially abusive reviews first for review.
    filter.rating = { $lte: max };
  }

  const [reviews, total] = await Promise.all([
    Review.find(filter)
      .populate("reviewer", "name email")
      .populate("reviewee", "name email")
      .populate({ path: "session", select: "scheduledAt activity", populate: { path: "activity", select: "name" } })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Review.countDocuments(filter),
  ]);

  return successResponse(
    res,
    { reviews, pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) } },
    "Reviews fetched"
  );
};

/**
 * @desc    Remove an abusive/inappropriate review
 * @route   DELETE /api/admin/reviews/:id
 * @access  Admin
 *
 * The reviewee's denormalized rating is recomputed immediately afterward so
 * the matching engine (which reads Profile.averageRating) never sees a stale
 * figure that includes the deleted review.
 */
const deleteReview = async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    throw httpError("Invalid review ID", 400);
  }

  const review = await Review.findByIdAndDelete(req.params.id);
  if (!review) {
    throw httpError("Review not found", 404);
  }

  const { averageRating, ratingCount } = await recalculateUserRating(review.reviewee);

  return successResponse(
    res,
    { deletedReviewId: review._id, revieweeRating: { averageRating, ratingCount } },
    "Review deleted"
  );
};

module.exports = {
  getReviews,
  deleteReview,
};
