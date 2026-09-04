const dotenv = require("dotenv");
dotenv.config();

const http = require("http");
const app = require("./app");
const connectDB = require("./config/db");
const initializeSocket = require("./socket/socket");
const { startRequestExpiryJob } = require("./services/requestExpiry.service");

// Application server port configuration
const PORT = process.env.PORT || 5000;

// Create HTTP server wrapping the Express application
const server = http.createServer(app);

// Initialize Socket.io real-time WebSocket connection engine
initializeSocket(server);

/**
 * Connects to MongoDB database and starts the HTTP server.
 */
const startServer = async () => {
    try {
        // 1. Establish MongoDB connection
        await connectDB();

        // 2. Start background job that expires stale pending requests
        startRequestExpiryJob();

        // 3. Start HTTP & Socket listener
        server.listen(PORT, () => {
            console.log(`Server running at http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error(`Server setup failed: ${error.message}`);
        process.exit(1);
    }
};

startServer();