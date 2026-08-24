const express = require("express");

const {
    createRequest,
    getUserRequests,
    acceptRequest,
    rejectRequest,
    cancelRequest,
} = require("../controllers/request.controller");

const { protect } = require("../middlewares/auth.middleware");

const router = express.Router();

router.post("/", protect, createRequest);

router.get("/", protect, getUserRequests);

router.patch("/:id/accept", protect, acceptRequest)

router.patch("/:id/reject", protect, rejectRequest)

router.delete("/:id", protect, cancelRequest);

module.exports = router;