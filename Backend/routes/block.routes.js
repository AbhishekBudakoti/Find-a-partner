const express = require("express");

const { createBlock, removeBlock, getMyBlocks } = require("../controllers/block.controller");
const asyncHandler = require("../middlewares/asyncHandler");
const { protect } = require("../middlewares/auth.middleware");

const router = express.Router();

router.get("/", protect, asyncHandler(getMyBlocks));
router.post("/:userId", protect, asyncHandler(createBlock));
router.delete("/:userId", protect, asyncHandler(removeBlock));

module.exports = router;
