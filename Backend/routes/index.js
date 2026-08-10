const express = require('express')

const healthRoutes = require('./healthRoute')

const router = express.Router()

router.use('/health', healthRoutes)

module.exports = router