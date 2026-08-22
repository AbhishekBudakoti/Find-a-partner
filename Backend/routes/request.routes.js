const express = require("express");

const {
    createRequest,
} = require("../controllers/request.controller");

const { protect } = require("../middlewares/auth.middleware");

const router = express.Router();

router.post("/", protect, createRequest);

module.exports = router;