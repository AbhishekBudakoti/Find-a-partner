const mongoose = require("mongoose")

const Profile = require("../models/profile.model")
const Match = require("../models/match.model")

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


/**
 * Lists the Match records the current user belongs to — their established
 * partners. Distinct from getMatches(), which ranks *candidate* profiles
 * returned by search: these are partnerships that already exist.
 *
 * The frontend needs these ids to propose a session (POST /api/sessions
 * requires a match id), and needs the partner's name to render a picker.
 */
const getMyMatches = async (req, res) => {
  const matches = await Match.find({
    users: req.user.id,
    status: "active",
  })
    .populate("users", "name email")
    .sort({ createdAt: -1 });

  // Surface the partner directly so the client isn't filtering the
  // two-user array itself on every render.
  const data = matches.map((match) => ({
    _id: match._id,
    status: match.status,
    createdAt: match.createdAt,
    partner: match.users.find(
      (user) => user._id.toString() !== req.user.id.toString()
    ),
  }));

  return successResponse(
    res,
    {
      count: data.length,
      matches: data,
    },
    "Matches fetched successfully"
  );
};

module.exports = {
  getMatches,
  getMyMatches,
};