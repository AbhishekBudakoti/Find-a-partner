const express = require("express");
const {
  proposeSession,
  getSessions,
  getSessionById,
  acceptSession,
  rejectSession,
  cancelSession,
  completeSession,
} = require("../controllers/session.controller");
const { protect } = require("../middlewares/auth.middleware");

const router = express.Router();

router.post("/", protect, proposeSession);
router.get("/", protect, getSessions);
router.get("/:id", protect, getSessionById);
router.patch("/:id/accept", protect, acceptSession);
router.patch("/:id/reject", protect, rejectSession);
router.patch("/:id/cancel", protect, cancelSession);
router.patch("/:id/complete", protect, completeSession);

module.exports = router;
