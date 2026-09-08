const express = require("express");

const {
    createReview,
    getUserReviews,
    getMyReviews,
    getPendingReviews,
} = require("../controllers/review.controller");

const asyncHandler = require("../middlewares/asyncHandler");
const { protect } = require("../middlewares/auth.middleware");

const router = express.Router();

router.post("/", protect, asyncHandler(createReview));

// Literal paths stay above "/user/:userId" so they are never read as params.
router.get("/mine", protect, asyncHandler(getMyReviews));
router.get("/pending", protect, asyncHandler(getPendingReviews));

router.get("/user/:userId", protect, asyncHandler(getUserReviews));

module.exports = router;
