const express = require("express");

const { getHealth } = require("../controllers/health.controller");
const asyncHandler = require("../middlewares/asyncHandler");

const router = express.Router();

router.get("/", asyncHandler(getHealth));



module.exports = router;