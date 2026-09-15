const mongoose = require("mongoose");

const Activity = require("../models/activity.model");
const Profile = require("../models/profile.model");
const { successResponse } = require("../utils/response");

const httpError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

/**
 * @desc    List every activity, including inactive ones, with how many
 *          profiles currently reference it
 * @route   GET /api/admin/activities
 * @access  Admin
 */
const getActivities = async (req, res) => {
  const activities = await Activity.find().sort({ name: 1 }).lean();

  const usage = await Profile.aggregate([
    { $unwind: "$activities" },
    { $group: { _id: "$activities", count: { $sum: 1 } } },
  ]);
  const usageMap = new Map(usage.map((u) => [u._id.toString(), u.count]));

  const withUsage = activities.map((activity) => ({
    ...activity,
    profileCount: usageMap.get(activity._id.toString()) || 0,
  }));

  return successResponse(res, { count: withUsage.length, activities: withUsage }, "Activities fetched");
};

/**
 * @desc    Update an activity's name, description, or active status
 * @route   PATCH /api/admin/activities/:id
 * @access  Admin
 *
 * Activities are never deleted here — profiles reference them by ObjectId,
 * so removing one would leave dangling references. Setting isActive:false
 * ("retiring" it) hides it from the public activity list and new profile
 * selection while leaving existing profiles/sessions/matches intact.
 */
const updateActivity = async (req, res) => {
  const { name, description, isActive } = req.body;

  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    throw httpError("Invalid activity ID", 400);
  }

  const activity = await Activity.findById(req.params.id);
  if (!activity) {
    throw httpError("Activity not found", 404);
  }

  if (name !== undefined) {
    const trimmed = String(name).trim();
    if (trimmed.length < 2 || trimmed.length > 50) {
      throw httpError("Activity name must be 2-50 characters", 400);
    }
    const duplicate = await Activity.findOne({
      _id: { $ne: activity._id },
      name: new RegExp(`^${trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
    });
    if (duplicate) {
      throw httpError("An activity with that name already exists", 409);
    }
    activity.name = trimmed;
  }

  if (description !== undefined) {
    if (String(description).length > 300) {
      throw httpError("Description cannot exceed 300 characters", 400);
    }
    activity.description = description;
  }

  if (isActive !== undefined) {
    if (typeof isActive !== "boolean") {
      throw httpError("isActive must be true or false", 400);
    }
    activity.isActive = isActive;
  }

  await activity.save();

  return successResponse(res, { activity }, "Activity updated");
};

module.exports = {
  getActivities,
  updateActivity,
};
