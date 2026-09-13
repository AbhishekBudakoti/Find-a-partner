const mongoose = require("mongoose")

const Profile = require("../models/profile.model")
const Match = require("../models/match.model")

const {calculateMatchScore,
  getMatchQuality} = require('../services/matching.service')


const { successResponse } = require("../utils/response");
const { getHiddenUserIds } = require("../services/block.service");

const getMatches=async (req,res)=>{
    const {activity,city,skillLevel,day,startTime,endTime,radiusKm,lat,lng} = req.query;

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

    // Blocked users (either direction) and suspended users never show up.
    const hiddenUserIds = await getHiddenUserIds(req.user.id);

    let profiles;
    if (radiusKm !== undefined && radiusKm !== "") {
      const radiusNum = Number(radiusKm);
      if (!Number.isFinite(radiusNum) || radiusNum < 1 || radiusNum > 100) {
        const error = new Error("Radius must be between 1 and 100 km");
        error.statusCode = 400;
        throw error;
      }

      let origin;
      if (lat !== undefined && lng !== undefined && lat !== "" && lng !== "") {
        const latNum = Number(lat);
        const lngNum = Number(lng);
        if (
          !Number.isFinite(latNum) ||
          !Number.isFinite(lngNum) ||
          latNum < -90 ||
          latNum > 90 ||
          lngNum < -180 ||
          lngNum > 180
        ) {
          const error = new Error("Invalid coordinates");
          error.statusCode = 400;
          throw error;
        }
        origin = [lngNum, latNum];
      } else {
        const myProfile = await Profile.findOne({ user: req.user.id }).select("location.point");
        if (!myProfile?.location?.point?.coordinates || myProfile.location.point.coordinates.length !== 2) {
          const error = new Error("Set your location in your profile first");
          error.statusCode = 400;
          throw error;
        }
        origin = myProfile.location.point.coordinates;
      }

      // Aggregation skips Mongoose casting, so every id here must be an ObjectId.
      const filter = {
        user: { $nin: [new mongoose.Types.ObjectId(req.user.id), ...hiddenUserIds] },
      };

      if (activity) {
        filter.activities = new mongoose.Types.ObjectId(activity);
      }

      const results = await Profile.aggregate([
        {
          $geoNear: {
            near: { type: "Point", coordinates: origin },
            distanceField: "distanceMeters",
            maxDistance: radiusNum * 1000,
            spherical: true,
            query: filter,
          },
        },
      ]);

      profiles = await Profile.populate(results, [
        { path: "user", select: "name email" },
        { path: "activities", select: "name" },
      ]);
    } else {
      const filter = { user: { $nin: [req.user.id, ...hiddenUserIds] } };

      if (activity) {
        filter.activities = activity;
      }

      profiles = await Profile.find(filter)
        .populate("user", "name email")
        .populate("activities", "name");
    }

    const criteria={activity,city,  skillLevel,
    day,
    startTime,
    endTime,
    radiusKm}

    const matches = profiles.map((profile)=>{
      const match =calculateMatchScore(profile,criteria);

      const profileObj = profile.toObject ? profile.toObject() : { ...profile };

      if (profileObj.location?.point?.coordinates) {
        const [lngVal, latVal] = profileObj.location.point.coordinates;
        const latRounded = Math.round(latVal * 100) / 100;
        const lngRounded = Math.round(lngVal * 100) / 100;
        profileObj.location.approxLocation = [latRounded, lngRounded];
        delete profileObj.location.point;
      }

      let distanceKm;
      if (profileObj.distanceMeters !== undefined) {
        const kmExact = profileObj.distanceMeters / 1000;
        distanceKm = kmExact < 1 ? "< 1" : Math.round(kmExact);
      }

      return {
        profile: profileObj,
        matchScore: match.score,
        matchQuality: getMatchQuality(match.score),
        matchBreakdown: match.breakdown,
        ...(distanceKm !== undefined && { distanceKm }),
      };
    }).sort((a, b) => {
      if (b.matchScore !== a.matchScore) {
        return b.matchScore - a.matchScore;
      }
      const distA = a.profile.distanceMeters ?? Infinity;
      const distB = b.profile.distanceMeters ?? Infinity;
      return distA - distB;
    });

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