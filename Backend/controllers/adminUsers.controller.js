const mongoose = require("mongoose");

const User = require("../models/user.model");
const Report = require("../models/report.model");
const { successResponse } = require("../utils/response");
const { suspendUser: suspendUserService } = require("../services/moderation.service");

const httpError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const MAX_SUSPEND_DAYS = 365;

/**
 * Adds `reportsReceivedCount` (all-time reports where the user is the
 * target) to each user, so the admin can spot repeat offenders in the list.
 */
const attachReportCounts = async (users) => {
  const ids = users.map((u) => u._id);
  if (ids.length === 0) return users;

  const counts = await Report.aggregate([
    { $match: { reportedUser: { $in: ids } } },
    { $group: { _id: "$reportedUser", count: { $sum: 1 } } },
  ]);
  const countMap = new Map(counts.map((c) => [c._id.toString(), c.count]));

  return users.map((user) => ({
    ...user,
    reportsReceivedCount: countMap.get(user._id.toString()) || 0,
  }));
};

/**
 * @desc    Search/list users (?q=&role=&suspended=true|false|all&page=&limit=)
 * @route   GET /api/admin/users
 * @access  Admin
 */
const getUsers = async (req, res) => {
  const { q = "", role, suspended = "all" } = req.query;
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));

  if (role && !["user", "admin"].includes(role)) {
    throw httpError("Invalid role filter", 400);
  }
  if (!["all", "true", "false"].includes(suspended)) {
    throw httpError("Invalid suspended filter", 400);
  }

  const filter = {};
  if (q.trim()) {
    // Escape regex metacharacters so a search like "a.b+c" can't throw or
    // behave as a pattern.
    const escaped = q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$or = [{ name: new RegExp(escaped, "i") }, { email: new RegExp(escaped, "i") }];
  }
  if (role) filter.role = role;
  if (suspended !== "all") filter.isSuspended = suspended === "true";

  const [users, total] = await Promise.all([
    User.find(filter)
      .select("name email role isSuspended suspendedUntil suspensionReason warningsCount createdAt")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    User.countDocuments(filter),
  ]);

  return successResponse(
    res,
    {
      users: await attachReportCounts(users),
      pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
    },
    "Users fetched"
  );
};

/**
 * @desc    Promote or demote a user
 * @route   PATCH /api/admin/users/:id/role
 * @body    { role: "user" | "admin" }
 * @access  Admin
 */
const updateUserRole = async (req, res) => {
  const { role } = req.body;

  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    throw httpError("Invalid user ID", 400);
  }
  if (!["user", "admin"].includes(role)) {
    throw httpError("Role must be 'user' or 'admin'", 400);
  }
  if (req.params.id === req.user.id) {
    // Stops an admin from locking themselves out (or the whole console, if
    // they're the only one) with a single misclick.
    throw httpError("You cannot change your own role", 400);
  }

  const user = await User.findById(req.params.id).select("role");
  if (!user) {
    throw httpError("User not found", 404);
  }
  if (user.role === role) {
    throw httpError(`User already has the '${role}' role`, 400);
  }

  if (user.role === "admin" && role === "user") {
    const adminCount = await User.countDocuments({ role: "admin" });
    if (adminCount <= 1) {
      throw httpError("At least one admin must remain", 400);
    }
  }

  user.role = role;
  await user.save();

  return successResponse(res, { userId: user._id, role: user.role }, "Role updated");
};

/**
 * @desc    Suspend a user directly (not tied to a specific report)
 * @route   PATCH /api/admin/users/:id/suspend
 * @body    { days?, reason? } - omit days for a permanent suspension
 * @access  Admin
 */
const suspendUserDirectly = async (req, res) => {
  const { reason = "", suspendDays } = req.body;

  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    throw httpError("Invalid user ID", 400);
  }
  if (req.params.id === req.user.id) {
    throw httpError("You cannot suspend yourself", 400);
  }
  if (typeof reason !== "string" || reason.length > 300) {
    throw httpError("Reason must be text up to 300 characters", 400);
  }

  let days = null;
  if (suspendDays !== undefined && suspendDays !== null && suspendDays !== "") {
    days = Number(suspendDays);
    if (!Number.isInteger(days) || days < 1 || days > MAX_SUSPEND_DAYS) {
      throw httpError(`Suspension days must be a whole number from 1 to ${MAX_SUSPEND_DAYS}`, 400);
    }
  }

  const target = await User.findById(req.params.id).select("role isSuspended");
  if (!target) {
    throw httpError("User not found", 404);
  }
  if (target.role === "admin") {
    throw httpError("Admin accounts cannot be suspended", 400);
  }
  if (target.isSuspended) {
    throw httpError("User is already suspended", 409);
  }

  const result = await suspendUserService(target._id, { days, reason: reason.trim() });

  return successResponse(res, { userId: target._id, ...result }, "User suspended");
};

/**
 * @desc    Users currently suspended
 * @route   GET /api/admin/users/suspended
 * @access  Admin
 */
const getSuspendedUsers = async (req, res) => {
  const users = await User.find({
    isSuspended: true,
    $or: [{ suspendedUntil: null }, { suspendedUntil: { $gt: new Date() } }],
  })
    .select("name email suspendedUntil suspensionReason warningsCount updatedAt")
    .sort({ updatedAt: -1 });

  return successResponse(res, { count: users.length, users }, "Suspended users fetched");
};

/**
 * @desc    Lift a user's suspension
 * @route   PATCH /api/admin/users/:id/unsuspend
 * @access  Admin
 */
const unsuspendUser = async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    throw httpError("Invalid user ID", 400);
  }

  const user = await User.findById(req.params.id).select("isSuspended");
  if (!user) {
    throw httpError("User not found", 404);
  }
  if (!user.isSuspended) {
    throw httpError("User is not suspended", 400);
  }

  await User.updateOne(
    { _id: user._id },
    { $set: { isSuspended: false, suspendedUntil: null, suspensionReason: "" } }
  );

  return successResponse(res, { userId: user._id }, "Suspension lifted");
};

module.exports = {
  getUsers,
  updateUserRole,
  suspendUserDirectly,
  getSuspendedUsers,
  unsuspendUser,
};
