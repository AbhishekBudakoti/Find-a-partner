const Notification = require("../models/notification.model");

const { getUserSocketIds } = require("./presence.service");
const { getIO } = require("../socket/socket");


const createNotification = async ({
    recipient,
    sender = null,
    type,
    message,
    relatedRequest = null,
    relatedMatch = null,
}) => {

    // 1. Save notification in MongoDB
    const notification = await Notification.create({
        recipient,
        sender,
        type,
        message,
        relatedRequest,
        relatedMatch,
    });


    // 2. Get recipient's active socket connections
    const socketIds = getUserSocketIds(recipient);


    // 3. Get Socket.IO instance
    const io = getIO();


    // 4. Send notification in real time
    if (io && socketIds.length > 0) {

        socketIds.forEach((socketId) => {

            io.to(socketId).emit(
                "notification:new",
                {
                    notification,
                }
            );

        });
    }


    return notification;
};

const getUserNotifications = async (userId, limit = 50) => {
    const notifications = await Notification.find({ recipient: userId })
        .sort({ createdAt: -1 })
        .populate("sender", "name email")
        .limit(limit);

    const unreadCount = await Notification.countDocuments({
        recipient: userId,
        isRead: false,
    });

    return {
        notifications,
        unreadCount,
    };
};

const markAsRead = async (notificationId, userId) => {
    const notification = await Notification.findOneAndUpdate(
        { _id: notificationId, recipient: userId },
        { isRead: true },
        { new: true }
    );

    if (!notification) {
        const error = new Error("Notification not found");
        error.statusCode = 404;
        throw error;
    }

    const unreadCount = await Notification.countDocuments({
        recipient: userId,
        isRead: false,
    });

    return {
        notification,
        unreadCount,
    };
};

const markAllAsRead = async (userId) => {
    await Notification.updateMany(
        { recipient: userId, isRead: false },
        { isRead: true }
    );

    return {
        unreadCount: 0,
    };
};

module.exports = {
    createNotification,
    getUserNotifications,
    markAsRead,
    markAllAsRead,
};