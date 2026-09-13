const mongoose = require("mongoose")

const Message = require("../models/message.model")
const { canUsersMessage } = require("../services/block.service")

const getChatHistory = async (req, res, next) => {
    try {
        const userId = req.user.id;

        const recipientId = req.params.userId;

        if (!mongoose.Types.ObjectId.isValid(recipientId)) {
            const error = new Error("Invalid user ID");
            error.statusCode = 400;
            throw error;
        }


        const messages = await Message.find({
            $or: [
                {
                    sender: userId,
                    recipient: recipientId,
                },
                {
                    sender: recipientId,
                    recipient: userId
                }
            ]
        }).sort({ createdAt: 1 })
            .populate("sender", "name email")
            .populate("recipient", "name email")

        // History stays readable after a block (it can be evidence for a
        // report), but the client uses this flag to disable the input.
        const canMessage = await canUsersMessage(userId, recipientId)

        res.status(200).json({
            success: true,
            message: "Chat history fetched successfully",
            data: { messages, canMessage }
        })
    }

    catch (error) {
        next(error)
    }
}


const markMessagesAsRead = async (req, res, next) => {


    try {
        const userId = req.user.id;
        const senderId = req.params.userId

        await Message.updateMany({
            sender: senderId,
            recipient: userId,
            isRead: false
        }, {
            isRead: true
        });

        res.status(200).json({
            success: true,
            message: "Message Marked As Read"

        })
    }
    catch (error) {
        next(error)
    }
}

module.exports = {
    getChatHistory,
    markMessagesAsRead
};