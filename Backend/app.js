const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const apiRoutes = require("./routes");
const notFound = require("./middlewares/notFound.middleware");
const errorHandler = require("./middlewares/error.midlleware");

/**
 * Express Application initialization and middleware pipeline setup.
 */
const app = express();

// --- CORS CONFIGURATION ---
app.use(
    cors({
        origin: process.env.CLIENT_URL || "http://localhost:5173",
        credentials: true,
    })
);

// --- BODY PARSERS ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- COOKIE PARSER ---
app.use(cookieParser());

// --- API ROUTES ---
app.use("/api", apiRoutes);

// --- 404 NOT FOUND MIDDLEWARE ---
app.use(notFound);

// --- GLOBAL ERROR HANDLER ---
app.use(errorHandler);

module.exports = app;