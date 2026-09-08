const mongoose = require("mongoose");

const Review = require("../models/review.model");
const Session = require("../models/session.model");
const asyncHandler = require("../middlewares/asyncHandler");
const { successResponse } = require("../utils/response");
const { createNotification } = require("../services/notification.service");
const { recalculateUserRating } = require("../services/rating.service");

/**
 * @desc    Leave a review for the partner from a completed session
 * @route   POST /api/reviews
 * @access  Private
 */
const createReview = asyncHandler(async (req, res) => {
    const { session: sessionId, rating, comment } = req.body;
    const reviewerId = req.user.id;

    if (!sessionId || rating === undefined) {
        const error = new Error("Session and rating are required");
        error.statusCode = 400;
        throw error;
    }

    if (!mongoose.Types.ObjectId.isValid(sessionId)) {
        const error = new Error("Invalid session ID");
        error.statusCode = 400;
        throw error;
    }

    const session = await Session.findById(sessionId);

    if (!session) {
        const error = new Error("Session not found");
        error.statusCode = 404;
        throw error;
    }

    const participantIds = session.participants.map((p) => p.toString());

    if (!participantIds.includes(reviewerId.toString())) {
        const error = new Error("You did not take part in this session");
        error.statusCode = 403;
        throw error;
    }

    // A rating only means something if the meetup actually happened. Sessions
    // reach "completed" solely from "active", i.e. after their start time.
    if (session.status !== Session.SESSION_STATUSES.COMPLETED) {
        const error = new Error("You can only review a completed session");
        error.statusCode = 400;
        throw error;
    }

    // Derive the reviewee from the session rather than trusting the body,
    // so nobody can attach a rating to a third party.
    const revieweeId = participantIds.find(
        (id) => id !== reviewerId.toString()
    );

    const existingReview = await Review.findOne({
        session: sessionId,
        reviewer: reviewerId,
    });

    if (existingReview) {
        const error = new Error("You have already reviewed this session");
        error.statusCode = 409;
        throw error;
    }

    const review = await Review.create({
        session: sessionId,
        reviewer: reviewerId,
        reviewee: revieweeId,
        rating,
        comment,
    });

    // Refresh the partner's denormalized figures so the matching engine
    // picks the new rating up immediately.
    const { averageRating, ratingCount } = await recalculateUserRating(revieweeId);

    await createNotification({
        recipient: revieweeId,
        sender: reviewerId,
        type: "review_received",
        message: `You received a ${rating}-star review.`,
        relatedSession: sessionId,
        relatedReview: review._id,
    });

    await review.populate("reviewer", "name email");

    return successResponse(
        res,
        {
            review,
            revieweeRating: { averageRating, ratingCount },
        },
        "Review submitted successfully",
        201
    );
});

/**
 * @desc    List the reviews a user has received, with their rating summary
 * @route   GET /api/reviews/user/:userId
 * @access  Private
 */
const getUserReviews = asyncHandler(async (req, res) => {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
        const error = new Error("Invalid user ID");
        error.statusCode = 400;
        throw error;
    }

    const reviews = await Review.find({ reviewee: userId })
        .populate("reviewer", "name email")
        .populate("session", "scheduledAt activity")
        .sort({ createdAt: -1 });

    const ratingCount = reviews.length;
    const averageRating = ratingCount
        ? Math.round(
              (reviews.reduce((sum, r) => sum + r.rating, 0) / ratingCount) * 10
          ) / 10
        : 0;

    return successResponse(
        res,
        { count: ratingCount, averageRating, ratingCount, reviews },
        "Reviews fetched successfully"
    );
});

/**
 * @desc    List the reviews the current user has written
 * @route   GET /api/reviews/mine
 * @access  Private
 */
const getMyReviews = asyncHandler(async (req, res) => {
    const reviews = await Review.find({ reviewer: req.user.id })
        .populate("reviewee", "name email")
        .populate("session", "scheduledAt activity")
        .sort({ createdAt: -1 });

    return successResponse(
        res,
        { count: reviews.length, reviews },
        "Reviews fetched successfully"
    );
});

/**
 * @desc    List completed sessions the current user has not reviewed yet
 * @route   GET /api/reviews/pending
 * @access  Private
 *
 * Drives the "rate your partner" prompt: without it the client would have to
 * fetch every completed session and diff it against its own reviews.
 */
const getPendingReviews = asyncHandler(async (req, res) => {
    const userId = req.user.id;

    const completedSessions = await Session.find({
        participants: userId,
        status: Session.SESSION_STATUSES.COMPLETED,
    })
        .populate("participants", "name email")
        .populate("activity", "name")
        .sort({ scheduledAt: -1 });

    const reviewedSessionIds = new Set(
        (await Review.find({ reviewer: userId }).select("session")).map((r) =>
            r.session.toString()
        )
    );

    const sessions = completedSessions.filter(
        (session) => !reviewedSessionIds.has(session._id.toString())
    );

    return successResponse(
        res,
        { count: sessions.length, sessions },
        "Pending reviews fetched successfully"
    );
});

module.exports = {
    createReview,
    getUserReviews,
    getMyReviews,
    getPendingReviews,
};
