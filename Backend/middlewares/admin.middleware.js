/**
 * Allows the request through only for admins. Must run AFTER `protect`, which
 * loads the caller's current role from the database into req.user.
 */
const adminOnly = (req, res, next) => {
    if (req.user?.role !== "admin") {
        const error = new Error("Admin access required");
        error.statusCode = 403;
        return next(error);
    }

    next();
};

module.exports = {
    adminOnly,
};
