const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const cookie = require("cookie");

const {
    addUserSocket,
    removeUserSocket,
    getOnlineUserIds,
} = require("../services/presence.service");

let ioInstance = null;

const initializeSocket = (server) => {
    const io = new Server(server, {
        cors: {
            origin: process.env.CLIENT_URL,
            credentials: true,
        },
    });

    ioInstance = io;

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
                process.env.JWT_SECRET || process.env.JWT_SECRETS || 'dev-secret-key'
            );

            socket.user = decoded;

            next();
        } catch (error) {
            console.error(
                "Socket JWT error:",
                error.name,
                error.message
            );

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

        // Send current online users to newly connected user
        socket.emit("presence:initial", {
            onlineUserIds: getOnlineUserIds(),
        });

        // Tell everyone that this user is online
        if (becameOnline) {
            io.emit("presence:online", {
                userId,
            });
        }

        // Socket disconnected
        socket.on("disconnect", () => {
            console.log(
                `Socket disconnected: ${socket.id}`
            );

            const becameOffline = removeUserSocket(
                userId,
                socket.id
            );

            // Only announce offline when the user
            // has no remaining active sockets
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

module.exports.getIO = () => ioInstance;