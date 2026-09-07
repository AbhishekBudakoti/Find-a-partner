const express = require("express");

const {
  getMatches,
  getMyMatches,
} = require("../controllers/match.controller");

const asyncHandler = require("../middlewares/asyncHandler");
const { protect } = require("../middlewares/auth.middleware");

const router = express.Router();

// Keep "/mine" above any "/:id" route added later — Express matches in
// declaration order and would otherwise read "mine" as an id.
router.get(
  "/mine",
  protect,
  asyncHandler(getMyMatches)
);

router.get(
  "/",
  protect,
  asyncHandler(getMatches)
);

module.exports = router;