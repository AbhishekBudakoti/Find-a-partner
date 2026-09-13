const express = require("express");

const { createReport } = require("../controllers/report.controller");
const asyncHandler = require("../middlewares/asyncHandler");
const { protect } = require("../middlewares/auth.middleware");

const router = express.Router();

router.post("/", protect, asyncHandler(createReport));

module.exports = router;
