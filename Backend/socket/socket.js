const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
// cookie v2 renamed its exports: parse/serialize became
// parseCookie/stringifyCookie. Import the name directly so a future rename
// fails loudly at boot instead of silently rejecting every socket handshake.
const { parseCookie } = require("cookie");

const Message = require("../models/message.model");
const PartnerRequest = require("../models/partnerRequest.model");
const {
    addUserSocket,
    removeUserSocket,
    getOnlineUserIds,
    getUserSocketIds,
} = require("../services/presence.service");

// Singleton reference to the Socket.io server instance
let ioInstance = null;

/**
 * Initializes the Socket.io server, configures CORS and JWT authentication middleware,
 * and sets up connection and event handlers for real-time presence and chat messaging.
 *
 * @param {import("http").Server} server - Node.js HTTP server instance.
 * @returns {Server} Initialized Socket.io server.
 */
const initializeSocket = (server) => {
    const io = new Server(server, {
        cors: {
            origin: process.env.CLIENT_URL || "http://localhost:5173",
            credentials: true,
        },
    });

    ioInstance = io;

    // --- SOCKET AUTHENTICATION MIDDLEWARE ---
    // Extract JWT token from cookie headers and authenticate incoming connection requests
    io.use((socket, next) => {
        try {
            const cookieHeader = socket.handshake.headers.cookie;

            if (!cookieHeader) {
                return next(new Error("Authentication required"));
            }

            const cookies = parseCookie(cookieHeader);
            const token = cookies?.token;

            if (!token) {
                return next(new Error("Authentication required"));
            }

            // Verify JWT token using configured secret
            const decoded = jwt.verify(
                token,
                process.env.JWT_SECRET || process.env.JWT_SECRETS || 'dev-secret-key'
            );

            // Attach decoded user metadata to the socket object
            socket.user = decoded;
            next();
        } catch (error) {
            console.error("Socket JWT authentication error:", error.name, error.message);
            next(new Error("Invalid or expired token"));
        }
    });

    // --- CONNECTION HANDLER ---
    io.on("connection", (socket) => {
        const userId = socket.user.id.toString();

        console.log(`User connected: ${userId} (Socket ID: ${socket.id})`);

        // Track active socket in presence service
        const becameOnline = addUserSocket(userId, socket.id);

        // Send snapshot of currently online users to the newly connected socket
        socket.emit("presence:initial", {
            onlineUserIds: getOnlineUserIds(),
        });

        // Broadcast presence update if this is the user's first active connection
        if (becameOnline) {
            io.emit("presence:online", {
                userId,
            });
        }

        // --- REAL-TIME CHAT EVENTS ---

        /**
         * Event handler for sending a chat message to a recipient.
         * Persists message to MongoDB and emits to recipient's socket(s) and sender.
         */
        socket.on("chat:send_message", async ({ recipientId, content }) => {
            try {

                const senderId = socket.user.id;


                if (!recipientId || !content?.trim()) {
                    return socket.emit("chat:error", {
                        message: "Recipient and message content are required",
                    });
                }


                if(senderId.toString() === recipientId.toString()){
                    return socket.emit("chat:error",{
                        message:"You cannot send a message to yourself"
                    })
                }

                    // Check whether the users are accepted partners

                    const acceptedRequest = await PartnerRequest.findOne({
                        status:"accepted",
                        $or:[
                            {
                                sender:senderId,
                                recipient:recipientId
                            },{
                                sender:recipientId,
                                recipient:senderId
                            }
                        ]
                    })

                    if(!acceptedRequest){
                        return socket.emit("chat:error",{message:"You can only chat with an accepted partner"})

                    }



                // Save message document in database
                const message = await Message.create({
                    sender: senderId,
                    recipient: recipientId,
                    content: content.trim(),
                });

                // Deliver message real-time to recipient's active sockets
                const recipientSocketIds = getUserSocketIds(recipientId);
                recipientSocketIds.forEach((socketId) => {
                    io.to(socketId).emit("chat:receive_message", {
                        message,
                    });
                });

                // Confirm message delivery back to sender socket
                socket.emit("chat:message_sent", {
                    message,
                });
            } catch (error) {
                console.error("Chat message error:", error);
                socket.emit("chat:error", { message: "Failed to send message" });
            }
        });

        socket.on("chat:typing", ({ recipientId }) => {
            if (!recipientId) return;

            const recipientSocketIds = getUserSocketIds(
                recipientId.toString()
            );

            recipientSocketIds.forEach((socketId) => {
                io.to(socketId).emit("chat:typing", {
                    userId: socket.user.id.toString(),
                });
            });
        });

        socket.on("chat:stop_typing", ({ recipientId }) => {
            if (!recipientId) return;
            const recipientSocketIds = getUserSocketIds(
                recipientId.toString()
            );

            recipientSocketIds.forEach((socketId) => {
                io.to(socketId).emit("chat:stop_typing", {
                    userId: socket.user.id.toString(),
                });
            });
        });

        // --- DISCONNECT HANDLER ---
        socket.on("disconnect", () => {
            console.log(`Socket disconnected: ${socket.id}`);

            // Remove socket reference from presence service
            const becameOffline = removeUserSocket(userId, socket.id);

            // Broadcast offline event only when user has no remaining active sockets
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

/**
 * Returns the global Socket.io server instance.
 *
 * @returns {Server|null} Socket.io server instance if initialized.
 */
module.exports.getIO = () => ioInstance;

