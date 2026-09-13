const jwt = require('jsonwebtoken')

const User = require('../models/user.model')
const { getActiveSuspension, buildSuspendedError } = require('../services/moderation.service')

/**
 * Authenticates the request from the httpOnly `token` cookie.
 *
 * The JWT only proves who the caller is. Role and suspension status are read
 * fresh from the database on every request, so suspending or demoting a user
 * takes effect immediately instead of when their 7-day token expires.
 */
const protect = async (req, res, next) => {
    const token = req.cookies?.token;

    if (!token) {
        const error = new Error('Authentication required')
        error.statusCode = 401;
        return next(error);
    }

    let decoded;
    try {
        decoded = jwt.verify(token, process.env.JWT_SECRET || process.env.JWT_SECRETS || 'dev-secret-key');
    } catch (error) {
        const authError = new Error('Invalid or expired token')
        authError.statusCode = 401;
        return next(authError)
    }

    try {
        const user = await User.findById(decoded.id).select('role isSuspended suspendedUntil suspensionReason');

        if (!user) {
            const error = new Error('User no longer exists')
            error.statusCode = 401;
            return next(error);
        }

        const suspension = await getActiveSuspension(user);
        if (suspension) {
            return next(buildSuspendedError(suspension));
        }

        req.user = {
            id: user._id.toString(),
            role: user.role,
        };
        next();
    } catch (error) {
        next(error)
    }
}

module.exports = {
  protect,
};
