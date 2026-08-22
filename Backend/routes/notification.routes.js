const express = require("express");

const {
    getNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
} = require("../controllers/notification.controller");

const { protect } = require("../middlewares/auth.middleware");
const asyncHandler = require("../middlewares/asyncHandler");

const router = express.Router();

router.get("/", protect, asyncHandler(getNotifications));
router.patch("/read-all", protect, asyncHandler(markAllNotificationsAsRead));
router.patch("/:id/read", protect, asyncHandler(markNotificationAsRead));

module.exports = router;
