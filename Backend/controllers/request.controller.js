const PartnerRequest = require("../models/partnerRequest.model");
const Match = require("../models/match.model");
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


const getUserRequests = async (req, res, next) => {

    try {
        const userId = req.user.id;

        const requests = await PartnerRequest.find({
            $or: [
                { sender: userId },
                { recipient: userId }
            ]
        })

            .populate("sender", "name email")
            .populate("recipient", "name email")
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            message: "request fetched successfully",
            data: { requests }
        })
    }
    catch (error) {
        next(error)

    }

}

const acceptRequest = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        const request = await PartnerRequest.findOne({
            _id: id,
            recipient: userId,
            status: "pending"
        });

        if (!request) {
            const error = new Error(
                "pending request not found"
            );
            error.statusCode = 404;
            throw error
        }

        request.status = "accepted";
        await request.save();

        // Form the partnership record. Reuse an existing match for this pair
        // if one is already on file (e.g. a prior request between the same users).
        let match = await Match.findOne({
            users: { $all: [request.sender, request.recipient] },
        });

        if (!match) {
            match = await Match.create({
                users: [request.sender, request.recipient],
                request: request._id,
            });
        }

        await createNotification({
            recipient: request.sender,
            sender: userId,
            type: "request_accepted",
            message: "Your partner request was accepted!",
            relatedRequest: request._id
        });

        // Notify both partners that a match now exists.
        await Promise.all([
            createNotification({
                recipient: request.sender,
                sender: request.recipient,
                type: "match_created",
                message: "You have a new partner! Say hello.",
                relatedRequest: request._id,
                relatedMatch: match._id,
            }),
            createNotification({
                recipient: request.recipient,
                sender: request.sender,
                type: "match_created",
                message: "You have a new partner! Say hello.",
                relatedRequest: request._id,
                relatedMatch: match._id,
            }),
        ]);

        res.status(200).json({
            success: true,
            message: "partner request accepted",
            data: { request, match }
        })

    }
    catch (error) {
        next(error)
    }
}


const rejectRequest = async (req, res, next) => {

    try {
        const userId = req.user.id;
        const { id } = req.params;

        const request = await PartnerRequest.findOne({
            _id: id,
            recipient: userId,
            status: "pending"
        });

        if (!request) {
            const error = new Error("Pending request not found");

            error.statusCode = 404;
            throw error;
        }

        request.status = "rejected"

        await request.save();

        await createNotification({
            recipient: request.sender,
            sender: userId,
            type: "request_rejected",
            message: "Your Partner requested was rejected",
            relatedRequest: request._id
        })

        res.status(200).json({
            success: true,
            message: "Partner Rejected Successfully ",
            data: { request }
        })
    }
    catch (error) {
        next(error)
    }
}

const cancelRequest = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;


        const request = await PartnerRequest.findOne({
            _id: id,
            sender: userId,
            status: "pending"
        })

        if (!request) {
            const error = new Error("Peding request not found")

            error.statusCode = 404;
            throw error
        }

        request.status = "cancelled"

        await request.save()

        await createNotification({
            recipient: request.recipient,
            sender: userId,
            type: "request_cancelled",
            message: "A Partner request was cancelled",
            relatedRequest: request._id
        })


        res.status(200).json({
            success: true,
            message: "Partner requested cancelled",
            data: {
                request
            }
        })
    }

    catch (error) {
        next(error)
    }


}

module.exports = {
    createRequest, getUserRequests, acceptRequest, rejectRequest,
    cancelRequest
};