const mongoose = require("mongoose");

const Review = require("../models/review.model");
const Profile = require("../models/profile.model");

/**
 * Recalculates a user's averageRating and ratingCount from the full set of
 * reviews they have received, and writes the result onto their Profile.
 *
 * Recomputing from scratch rather than incrementing a running total keeps the
 * denormalized figures self-healing: if a review is ever edited or deleted the
 * next recompute corrects the profile, where an incremental counter would
 * silently drift. The aggregation is indexed on `reviewee`, so this stays cheap.
 *
 * The profile is the read model the matching engine consumes
 * (see services/matching.service.js), which is why the value lives there
 * instead of being computed per request.
 *
 * @param {string|mongoose.Types.ObjectId} userId - The reviewed user's ID.
 * @returns {Promise<{averageRating: number, ratingCount: number}>} The stored figures.
 */
const recalculateUserRating = async (userId) => {
    const revieweeId = new mongoose.Types.ObjectId(userId.toString());

    const [summary] = await Review.aggregate([
        { $match: { reviewee: revieweeId } },
        {
            $group: {
                _id: "$reviewee",
                averageRating: { $avg: "$rating" },
                ratingCount: { $sum: 1 },
            },
        },
    ]);

    // No reviews left (or none yet) resets the profile to "unrated", which the
    // matching engine scores as a neutral 0.5 rather than a zero.
    const averageRating = summary
        ? Math.round(summary.averageRating * 10) / 10
        : 0;
    const ratingCount = summary ? summary.ratingCount : 0;

    // A user may not have created a profile yet; there is simply nothing to
    // update in that case, and the figures are recomputed when they do.
    await Profile.findOneAndUpdate(
        { user: revieweeId },
        { averageRating, ratingCount }
    );

    return { averageRating, ratingCount };
};

module.exports = {
    recalculateUserRating,
};
