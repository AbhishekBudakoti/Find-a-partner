const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const cookie = require("cookie");

const {
    addUserSocket,
    removeUserSocket,getOnlineUserIds
} = require("../services/presence.service");

const initializeSocket = (server) => {
    const io = new Server(server, {
        cors: {
            origin: process.env.CLIENT_URL,
            credentials: true,
        },
    });

    // Socket authentication
    io.use((socket, next) => {
        try {
            const cookieHeader = socket.handshake.headers.cookie;

            if (!cookieHeader) {
                return next(new Error("Authentication required"));
            }

            const cookies = cookie.parse(cookieHeader);

            const token = cookies.token;

            if (!token) {
                return next(new Error("Authentication required"));
            }

            const decoded = jwt.verify(
                token,
                process.env.JWT_SECRET
            );

            socket.user = decoded;

            next();
        } catch (error) {
            next(new Error("Invalid or expired token"));
        }
    });

    // Socket connection
    io.on("connection", (socket) => {
    const userId = socket.user.id.toString();

    console.log(`User connected: ${userId}`);
    console.log(`Socket ID: ${socket.id}`);

    const becameOnline = addUserSocket(
        userId,
        socket.id
    );

    socket.emit("presence:initial", {
        onlineUserIds: getOnlineUserIds(),
    });

    if (becameOnline) {
        io.emit("presence:online", {
            userId,
        });
    }

    socket.on("disconnect", () => {
        console.log(
            `Socket disconnected: ${socket.id}`
        );

        const becameOffline = removeUserSocket(
            userId,
            socket.id
        );

        if (becameOffline) {
            io.emit("presence:offline", {
                userId,
            });
        }
    });
});

    return io;
};

module.exports = initializeSocket;