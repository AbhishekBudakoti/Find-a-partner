const express = require("express");

const {
  getMatches,
} = require("../controllers/match.controller");

const asyncHandler = require("../middlewares/asyncHandler");
const { protect } = require("../middlewares/auth.middleware");

const router = express.Router();

router.get(
  "/",
  protect,
  asyncHandler(getMatches)
);

module.exports = router;