const Session = require("../models/session.model");
const { successResponse } = require("../utils/response");

const httpError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

/**
 * @desc    List every session on the platform (?status=&page=&limit=)
 * @route   GET /api/admin/sessions
 * @access  Admin
 */
const getSessions = async (req, res) => {
  const { status } = req.query;
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));

  if (status && !Object.values(Session.SESSION_STATUSES).includes(status)) {
    throw httpError("Invalid status filter", 400);
  }

  const filter = status ? { status } : {};

  const [sessions, total, statusCounts] = await Promise.all([
    Session.find(filter)
      .populate("participants", "name email")
      .populate("activity", "name")
      .populate("proposedBy", "name email")
      .sort({ scheduledAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Session.countDocuments(filter),
    Session.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
  ]);

  const counts = Object.fromEntries(Object.values(Session.SESSION_STATUSES).map((s) => [s, 0]));
  statusCounts.forEach((c) => {
    counts[c._id] = c.count;
  });

  return successResponse(
    res,
    {
      sessions,
      counts,
      pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
    },
    "Sessions fetched"
  );
};

module.exports = {
  getSessions,
};
