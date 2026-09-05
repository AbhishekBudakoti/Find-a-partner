const express = require('express')

const healthRoutes = require('./health.routes')
const authRoutes = require('./auth.routes')
const activityRoutes = require('./activity.routes')
const profileRoutes = require('./profile.routes')
const partnerRoutes = require('./partner.routes')
const matchRoutes = require("./match.routes");
const requestRoutes = require("./request.routes");
const notificationRoutes = require("./notification.routes");
const chatRoutes = require("./chat.routes")
const sessionRoutes = require("./session.routes")

const router = express.Router()

router.use('/health', healthRoutes)
router.use('/auth', authRoutes)
router.use('/activities', activityRoutes)
router.use('/profile', profileRoutes)
router.use("/partners", partnerRoutes)
router.use("/matches", matchRoutes);
router.use("/requests", requestRoutes);
router.use("/notifications", notificationRoutes);
router.use("/chat", chatRoutes)
router.use("/sessions", sessionRoutes)

module.exports = router