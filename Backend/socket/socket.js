const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const cookie = require("cookie");
const parseCookie = cookie.parseCookie || cookie.parse;

const {
    addUserSocket,
    removeUserSocket, getOnlineUserIds
} = require("../services/presence.service");

const initializeSocket = (server) => {
    const io = new Server(server, {
        cors: {
            origin: process.env.CLIENT_URL || "http://localhost:5173",
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

            const cookies = parseCookie(cookieHeader);

            const token = cookies.token;

            if (!token) {
                return next(new Error("Authentication required"));
            }
            console.log("Socket token received:", !!token);
            const JWT_SECRET = process.env.JWT_SECRET || process.env.JWT_SECRETS || 'dev-secret-key';
            const decoded = jwt.verify(
                token,
                JWT_SECRET
            );

            socket.user = decoded;

            next();
        } catch (error) {
            console.log("SOCKET JWT ERROR");
            console.log("Name:", error.name);
            console.log("Message:", error.message);

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
            socket.broadcast.emit("presence:online", {
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