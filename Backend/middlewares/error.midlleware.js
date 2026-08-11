const errorHandler = (err, req, res, next) => {
    const statusCode = err.statusCode || 500;

    console.error(err.stack || err);

    res.status(statusCode).json({
        success: false,
        message: err.message || "Internal Server Error"
    });
};

module.exports = errorHandler;

// This gives us one central place for API errors.
// when we build authentication, validation, matching, chat, etc., errors can flow into this middleware.