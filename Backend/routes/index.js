const express = require('express')

const healthRoutes = require('./healthRoute')
const authRoutes=require('./auth.routes')
const router = express.Router()

router.use('/health', healthRoutes)
router.use('/auth',authRoutes)

module.exports = router