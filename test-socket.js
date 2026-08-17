const { io } = require("socket.io-client");

const socket = io("http://localhost:3000", {
    withCredentials: true,
});

socket.on("connect", () => {
    console.log("Socket connected");
    console.log("Socket ID:", socket.id);
});

socket.on("connect_error", (error) => {
    console.log("Connection error:", error.message);
});

socket.on("presence:initial", (data) => {
    console.log("Initial presence:", data);
});

socket.on("presence:online", (data) => {
    console.log("User online:", data);
});

socket.on("presence:offline", (data) => {
    console.log("User offline:", data);
});

socket.on("disconnect", (reason) => {
    console.log("Socket disconnected:", reason);
});