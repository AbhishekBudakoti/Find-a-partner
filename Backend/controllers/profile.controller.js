
const Profile = require('../models/profile.model')
const Activity = require('../models/activity.model')

const {successResponse}=require('../utils/response')


const createProfile = async(req,res) =>{
    const {avatar,bio,activities,skillLevel,
    availability,
    location,} = req.body;

    const existingProfile = await Profile.findOne({ user:req.user.id})

    if(existingProfile){
        const error = new Error("Profile already exists")
        error.statusCode=400
        throw error;
    }

    if(activities?.length){
        const validActivities =await Activity.countDocuments({
            _id:{$in:activities},
            isActive:true
        })

        if(validActivities !== activities.length){
            const error = new Error ("One or more activities are invalid")
            error.statusCode=400
            throw error;
        }
    }

    const profile = await Profile.create({
        user:req.user.id,
        avatar,
           bio,
    activities,
    skillLevel,
    availability,
    location,
    })



    await profile.populate("activities");

    return successResponse(res,{profile},"Profile created successfully",201)
}


const getMyProfile = async (req,res) =>{
    const profile = await Profile.findOne({user:req.user.id})
    .populate("user","name email role")
    .populate("activities");

    if(!profile){
        const error=new Error("Profile not found")
        error.statusCode=404;
        throw error;
    }

    return successResponse(
        res,{profile},"Profile fetched Successfully"
    );
}


const updateMyProfile = async (req,res) =>{

    const {  avatar,
    bio,
    activities,
    skillLevel,
    availability,
    location } = req.body;

    const profile=await Profile.findOne({ user:req.user.id})


    if(!profile){
        const error = new Error("Profile not found");
        error.statusCode=404;
        throw error;
    }

    if(activities){
        const  validActivities = await Activity.countDocuments({
            _id:{$in: activities},
            isActive:true
        })

        if(validActivities !== activities.length){
            const error = new Error ("One or more activities are invalid")
            error.statusCode=400
            throw error;
        }

        profile.activities=activities
    }

     if (avatar !== undefined) profile.avatar = avatar;
     if (bio !== undefined) profile.bio = bio;
       if (skillLevel !== undefined) profile.skillLevel = skillLevel;
  if (availability !== undefined) profile.availability = availability;
    if (location !== undefined) profile.location = location;

    await profile.save();

    await profile.populate("activities");

    return successResponse(res,{profile},"profile updated successfully")

}


module.exports = {
  createProfile,
  getMyProfile,
  updateMyProfile,
};