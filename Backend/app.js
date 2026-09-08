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

// Express 5 leaves req.body undefined when a request carries no body, where
// Express 4 defaulted it to {}. Controllers destructure req.body directly, so
// a bodyless POST/PATCH would throw a TypeError and surface as a 500. Restore
// the empty-object default once here rather than guarding at every call site.
app.use((req, res, next) => {
    if (req.body === undefined) {
        req.body = {};
    }
    next();
});

// --- COOKIE PARSER ---
app.use(cookieParser());

// --- API ROUTES ---
app.use("/api", apiRoutes);

// --- 404 NOT FOUND MIDDLEWARE ---
app.use(notFound);

// --- GLOBAL ERROR HANDLER ---
app.use(errorHandler);

module.exports = app;