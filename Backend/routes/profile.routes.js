const express = require('express')

const {getMyProfile,updateMyProfile,createProfile}=require('../controllers/profile.controller')



const asyncHandler = require("../middlewares/asyncHandler")
const {protect} = require("../middlewares/auth.middleware")


const router = express.Router();


router.use(protect);

router.post("/",asyncHandler(createProfile))

router.get("/me",asyncHandler(getMyProfile))

router.patch("/me",asyncHandler(updateMyProfile))


module.exports = router;