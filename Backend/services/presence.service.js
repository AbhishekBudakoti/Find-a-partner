/**
 * Map storing active socket connection sets per user ID.
 * Key: userId (string) -> Value: Set of active socket IDs (Set<string>)
 */
const onlineUsers = new Map();

/**
 * Registers a new socket ID for a given user ID.
 *
 * @param {string} userId - User ID.
 * @param {string} socketId - Socket connection ID.
 * @returns {boolean} True if this is the user's first active socket (became online), false otherwise.
 */
const addUserSocket = (userId, socketId) => {
    const existingSockets = onlineUsers.get(userId);

    if (existingSockets) {
        existingSockets.add(socketId);
        return false;
    } else {
        onlineUsers.set(userId, new Set([socketId]));
        return true;
    }
};

/**
 * Removes a socket ID for a given user ID.
 *
 * @param {string} userId - User ID.
 * @param {string} socketId - Socket connection ID.
 * @returns {boolean} True if the user has no remaining active sockets (became offline), false otherwise.
 */
const removeUserSocket = (userId, socketId) => {
    const existingSockets = onlineUsers.get(userId);

    if (!existingSockets) {
        return false;
    }

    existingSockets.delete(socketId);

    if (existingSockets.size === 0) {
        onlineUsers.delete(userId);
        return true;
    }

    return false;
};

/**
 * Checks if a user currently has any active socket connections.
 *
 * @param {string} userId - User ID.
 * @returns {boolean} True if user is online, false otherwise.
 */
const isUserOnline = (userId) => {
    return onlineUsers.has(userId);
};

/**
 * Retrieves an array of all currently online user IDs.
 *
 * @returns {string[]} Array of online user IDs.
 */
const getOnlineUserIds = () => {
    return [...onlineUsers.keys()];
};

/**
 * Retrieves an array of active socket IDs for a given user ID.
 *
 * @param {string|number} userId - User ID.
 * @returns {string[]} Array of socket IDs.
 */
const getUserSocketIds = (userId) => {
    const sockets = onlineUsers.get(userId.toString());

    if (!sockets) {
        return [];
    }

    return Array.from(sockets);
};

module.exports = {
    addUserSocket,
    removeUserSocket,
    isUserOnline,
    getOnlineUserIds,
    getUserSocketIds,
};