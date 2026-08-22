const {
    getUserNotifications,
    markAsRead,
    markAllAsRead,
} = require("../services/notification.service");
const { successResponse } = require("../utils/response");

const getNotifications = async (req, res) => {
    const userId = req.user.id;
    const data = await getUserNotifications(userId);

    return successResponse(
        res,
        data,
        "Notifications fetched successfully"
    );
};

const markNotificationAsRead = async (req, res) => {
    const userId = req.user.id;
    const { id } = req.params;

    const data = await markAsRead(id, userId);

    return successResponse(
        res,
        data,
        "Notification marked as read successfully"
    );
};

const markAllNotificationsAsRead = async (req, res) => {
    const userId = req.user.id;
    const data = await markAllAsRead(userId);

    return successResponse(
        res,
        data,
        "All notifications marked as read successfully"
    );
};

module.exports = {
    getNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
};
