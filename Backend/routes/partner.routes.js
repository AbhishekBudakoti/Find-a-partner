const express = require("express")

const {searchPartners}=require("../controllers/partner.controller")

const  asyncHandler = require("../middlewares/asyncHandler")

const {protect} = require("../middlewares/auth.middleware")

const router = express.Router();

router.get("/",protect,asyncHandler(searchPartners));

module.exports = router;