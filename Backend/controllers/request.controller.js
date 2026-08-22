const PartnerRequest = require("../models/partnerRequest.model");
const { createNotification } = require("../services/notification.service");

const createRequest = async (req, res, next) => {
    try {
        const { recipient, message } = req.body;

        const sender = req.user.id;

        if (!recipient) {
            const error = new Error("Recipient is required");
            error.statusCode = 400;
            throw error;
        }

        if (sender.toString() === recipient.toString()) {
            const error = new Error("You cannot send a request to yourself");
            error.statusCode = 400;
            throw error;
        }

        const existingRequest = await PartnerRequest.findOne({
            sender,
            recipient,
            status: "pending",
        });

        if (existingRequest) {
            const error = new Error("Pending request already exists");
            error.statusCode = 409;
            throw error;
        }

        const expireAt = new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000
        );

        const request = await PartnerRequest.create({
            sender,
            recipient,
            message,
            expireAt,
        });

        await createNotification({
            recipient,
            sender,
            type: "partner_request",
            message: "You received a new partner request.",
            relatedRequest: request._id,
        });

        res.status(201).json({
            success: true,
            message: "Partner request sent successfully",
            data: {
                request,
            },
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createRequest,
};