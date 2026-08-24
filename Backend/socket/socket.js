const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const cookie = require("cookie");
const Message = require("../models/message.model")

const {
    addUserSocket,
    removeUserSocket,
    getOnlineUserIds,
    getUserSocketIds
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


            //CHAT EVENT 


            socket.on("chat:send_message", async ({ recipientId, content }) => {
                try {
                    if (!recipientId || !content?.trim()) {
                        return socket.emit("chat:error", {
                            message: "Recipient and message content are required"

                        })
                    }

                    const senderId = socket.user.id;

                    const message = await Message.create({
                        sender: senderId,
                        recipient: recipientId,
                        content: content.trim()
                    })

                    const recipientSocketIds = getUserSocketIds(recipientId);

                    recipientSocketIds.forEach((socketId) => {
                        io.to(socketId).emit("chat:recieve_message", {
                            message
                        })
                    })
                    socket.emit("chat:message_sent", {
                        message
                    })

                }
                catch (error) {
                    console.error("Chat message error:", error)
                    socket.emit("chat:error", { message: "Failed to send message", })
                }
            })
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