const Notification = require("../models/notification.model");
const { getUserSocketIds } = require("./presence.service");
const { getIO } = require("../socket/socket");

/**
 * Creates a notification in MongoDB and emits a real-time socket event if recipient is online.
 *
 * @param {Object} params - Notification details.
 * @param {string} params.recipient - Recipient User ID.
 * @param {string|null} [params.sender] - Optional sender User ID.
 * @param {string} params.type - Type category of notification.
 * @param {string} params.message - Notification message content.
 * @param {string|null} [params.relatedRequest] - Optional PartnerRequest ID reference.
 * @param {string|null} [params.relatedMatch] - Optional Match ID reference.
 * @returns {Promise<Object>} Created database notification object.
 */
const createNotification = async ({
    recipient,
    sender = null,
    type,
    message,
    relatedRequest = null,
    relatedMatch = null,
}) => {
    // 1. Save notification document in MongoDB
    const notification = await Notification.create({
        recipient,
        sender,
        type,
        message,
        relatedRequest,
        relatedMatch,
    });

    // 2. Retrieve active socket IDs for recipient
    const socketIds = getUserSocketIds(recipient);

    // 3. Get global Socket.io instance
    const io = getIO();

    // 4. Emit notification in real time to connected recipient sockets
    if (io && socketIds.length > 0) {
        socketIds.forEach((socketId) => {
            io.to(socketId).emit("notification:new", {
                notification,
            });
        });
    }

    return notification;
};

/**
 * Fetches notifications for a user, ordered by newest first, and returns unread count.
 *
 * @param {string} userId - User ID.
 * @param {number} [limit=50] - Maximum number of notifications to retrieve.
 * @returns {Promise<{notifications: Array, unreadCount: number}>} User notifications payload.
 */
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

/**
 * Marks a specific notification as read by ID for a user.
 *
 * @param {string} notificationId - Notification object ID.
 * @param {string} userId - Recipient User ID.
 * @returns {Promise<{notification: Object, unreadCount: number}>} Updated notification and unread count.
 */
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

/**
 * Marks all notifications for a specific user as read.
 *
 * @param {string} userId - User ID.
 * @returns {Promise<{unreadCount: number}>} Object containing zero unread count.
 */
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