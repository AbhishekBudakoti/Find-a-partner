const mongoose = require("mongoose");

const Profile = require("../models/profile.model");
const { successResponse } = require("../utils/response");

const searchPartners = async (req, res) => {
  const {
    activity,
    skillLevel,
    day,
    startTime,
    endTime,
  } = req.query;

  const filter = {
    user: {
      $ne: req.user.id,
    },
  };

  // Filter by activity
  if (activity) {
    if (!mongoose.Types.ObjectId.isValid(activity)) {
      const error = new Error("Invalid activity ID");
      error.statusCode = 400;
      throw error;
    }

    filter.activities = activity;
  }

  // Filter by skill level
  if (skillLevel) {
    const allowedSkillLevels = [
      "beginner",
      "intermediate",
      "advanced",
    ];

    if (!allowedSkillLevels.includes(skillLevel)) {
      const error = new Error("Invalid skill level");
      error.statusCode = 400;
      throw error;
    }

    filter.skillLevel = skillLevel;
  }

  // Filter by availability
  if (day) {
    const availabilityFilter = {
      day,
    };

    if (startTime && endTime) {
      availabilityFilter.startTime = {
        $lte: startTime,
      };

      availabilityFilter.endTime = {
        $gte: endTime,
      };
    }

    filter.availability = {
      $elemMatch: availabilityFilter,
    };
  }

  const profiles = await Profile.find(filter)
    .populate("user", "name email")
    .populate("activities", "name")
    .sort({ createdAt: -1 });

  return successResponse(
    res,
    {
      count: profiles.length,
      profiles,
    },
    "Partners fetched successfully"
  );
};

module.exports = {
  searchPartners,
};