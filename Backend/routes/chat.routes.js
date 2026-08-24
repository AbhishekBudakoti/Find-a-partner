const express = require('express')

const { markMessagesAsRead, getChatHistory } = require('../controllers/chat.controller')

const { protect } = require('../middlewares/auth.middleware')

const router = express.Router()

router.get("/:userId", protect, getChatHistory)
router.patch("/:userId", protect, markMessagesAsRead)

module.exports = router;