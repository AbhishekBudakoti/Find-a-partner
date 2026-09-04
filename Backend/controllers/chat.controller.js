const Message = require("../models/message.model")

const getChatHistory = async (req, res, next) => {
    try {
        const userId = req.user.id;

        const recipientId = req.params.userId;


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

        res.status(200).json({
            success: true,
            message: "Chat history fetched successfully",
            data: { messages }
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