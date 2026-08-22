const onlineUsers = new Map();

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

const isUserOnline = (userId) => {
    return onlineUsers.has(userId);
};

const getOnlineUserIds = () => {
    return [...onlineUsers.keys()];
};


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