const mongoose = require("mongoose")

const Profile = require("../models/profile.model")

const {calculateMatchScore,
  getMatchQuality} = require('../services/matching.service')


const { successResponse } = require("../utils/response");

const getMatches=async (req,res)=>{
    const {activity,city,skillLevel,day,startTime,endTime} = req.query;

    // Validate activity ID

    if(activity && !mongoose.Types.ObjectId.isValid(activity)){
      const error =  new Error("Invalid activity ID")
      error.statusCode= 400;
      throw error;
    }

     // Validate skill

     if(skillLevel && ![  "beginner",
      "intermediate",
      "advanced"].includes(skillLevel)){
        const error = new Error("Invalid Skill Level");
         error.statusCode= 400;
      throw error;
      }

      const filter = {user:{$ne: req.user.id}}


  // Activity is a hard filter.

    if(activity)
    {
      filter.activities = activity;
    }

    // Get potential partners

    const profiles = await Profile.find(filter)
    .populate("user","name email")
    .populate("activities","name");

    const criteria={activity,city,  skillLevel,
    day,
    startTime,
    endTime,}

    const matches = profiles.map((profile)=>{
      const match =calculateMatchScore(profile,criteria);

      return {  profile,
        matchScore: match.score,
        matchQuality: getMatchQuality(match.score),
        matchBreakdown: match.breakdown}
    }).sort((a,b)=>b.matchScore - a.matchScore)

    return successResponse(res,{
      count: matches.length,
      matches
    },"Partners ranked successfully")

}


module.exports = {
  getMatches,
};