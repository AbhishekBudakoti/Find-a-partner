const jwt = require('jsonwebtoken')

const protect = (req, res, next) => {
    const token = req.cookies?.token;

    if (!token) {
        const error = new Error('Authentication required')
        error.statusCode = 401;
        return next(error);
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || process.env.JWT_SECRETS || 'dev-secret-key');

        req.user = decoded;
        next();
    } catch (error) {
        const authError = new Error('Invalid or expired token')
        authError.statusCode = 401;

        next(authError)
    }
}

module.exports = {
  protect,
};