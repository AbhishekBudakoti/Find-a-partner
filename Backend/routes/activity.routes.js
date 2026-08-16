const express=require("express")

const {getActivity,createActivity}=require('../controllers/activity.controller')


const asyncHandler=require('../middlewares/asyncHandler')

const {protect}=require('../middlewares/auth.middleware')

const router= express.Router()


router.get("/", asyncHandler(getActivity))

router.post("/", protect, asyncHandler(createActivity))


module.exports=router;