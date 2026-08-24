const Activity = require("../models/activity.model")

const { successResponse } = require("../utils/response")


const createActivity = async (req, res) => {
    console.log('createActivity called', { body: req.body, user: req.user });
    const { name, description } = req.body;

    if (!name) {
        const error = new Error("Activity name is required");
        error.statusCode = 400;
        throw error;
    }

    const existingActivity = await Activity.findOne({ name: name.trim() })

    if (existingActivity) {
        const error = new Error("Activity already exist")
        error.statusCode = 409;
        throw error;
    }

    const activity = await Activity.create({
        name: name.trim(),
        description,
    })

    console.log('activity created', activity)


    return successResponse(
        res, { activity }, "Activity created successfully"
    )


};

const getActivity = async (req, res) => {
    const activities = await Activity.find({
        isActive: true
    }).sort({ name: 1 })

    return successResponse(
        res, { activities }, "Activities fetched successfully"
    )
};

module.exports = { createActivity, getActivity }