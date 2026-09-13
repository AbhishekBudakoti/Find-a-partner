const errorHandler = (err, req, res, next) => {
    let statusCode = err.statusCode || 500;
    let message = err.message || "Internal Server Error";

    // Mongoose errors arrive with no statusCode, so they'd default to 500 even
    // though they're caused by bad client input. Translate them to 4xx — but
    // only when a controller hasn't already set an explicit status.
    if (!err.statusCode) {
        if (err.name === "ValidationError") {
            // Schema rule broken, e.g. durationMinutes below its min of 15
            statusCode = 400;
            message = Object.values(err.errors)
                .map((e) => e.message)
                .join(", ");
        } else if (err.name === "CastError") {
            // Malformed ObjectId, e.g. activity: "not-an-objectid"
            statusCode = 400;
            message = `Invalid ${err.path}`;
        } else if (err.code === 11000) {
            // Unique index violation, e.g. registering an existing email
            statusCode = 409;
            const field = Object.keys(err.keyValue || {})[0] || "field";
            message = `That ${field} is already in use`;
        }
    }

    if (statusCode === 401) {
        console.warn(`[401 Unauthenticated] ${req.method} ${req.originalUrl} - ${err.message}`);
    } else if (statusCode >= 500) {
        console.error(err.stack || err);
    }

    res.status(statusCode).json({
        success: false,
        message,
        // Machine-readable code (e.g. "ACCOUNT_SUSPENDED") so the client can
        // react to specific failures without string-matching the message.
        ...(err.errorCode && { code: err.errorCode }),
    });
};

module.exports = errorHandler;