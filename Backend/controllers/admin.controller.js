const mongoose = require("mongoose");

const Report = require("../models/report.model");
const User = require("../models/user.model");
const { successResponse } = require("../utils/response");
const { createNotification } = require("../services/notification.service");
const { suspendUser } = require("../services/moderation.service");

const RESOLVE_ACTIONS = ["dismiss", "warn", "suspend"];
const MAX_SUSPEND_DAYS = 365;

const httpError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const populateReport = (query) =>
  query
    .populate("reporter", "name email")
    .populate("reportedUser", "name email role isSuspended suspendedUntil warningsCount")
    .populate("reviewedBy", "name email")
    .populate({
      path: "session",
      select: "scheduledAt status durationMinutes location activity",
      populate: { path: "activity", select: "name" },
    });

/**
 * Adds `reportedUserReportCount` (all-time reports against that user) to each
 * report, so an admin can spot repeat offenders at a glance.
 */
const attachReportCounts = async (reports) => {
  const userIds = [
    ...new Set(reports.map((r) => r.reportedUser?._id?.toString()).filter(Boolean)),
  ].map((id) => new mongoose.Types.ObjectId(id));

  if (userIds.length === 0) return reports;

  const counts = await Report.aggregate([
    { $match: { reportedUser: { $in: userIds } } },
    { $group: { _id: "$reportedUser", count: { $sum: 1 } } },
  ]);
  const countMap = new Map(counts.map((c) => [c._id.toString(), c.count]));

  return reports.map((report) => ({
    ...report,
    reportedUserReportCount: countMap.get(report.reportedUser?._id?.toString()) || 0,
  }));
};

/**
 * @desc    Moderation queue (?status=pending|dismissed|actioned|all&page=&limit=)
 * @route   GET /api/admin/reports
 * @access  Admin
 */
const getReports = async (req, res) => {
  const status = req.query.status || "pending";
  if (status !== "all" && !Report.REPORT_STATUSES.includes(status)) {
    throw httpError("Invalid status filter", 400);
  }

  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const filter = status === "all" ? {} : { status };

  const [reports, total, statusCounts] = await Promise.all([
    populateReport(
      Report.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
    ).lean(),
    Report.countDocuments(filter),
    Report.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
  ]);

  const counts = { pending: 0, dismissed: 0, actioned: 0 };
  statusCounts.forEach((c) => {
    counts[c._id] = c.count;
  });
  counts.all = counts.pending + counts.dismissed + counts.actioned;

  return successResponse(
    res,
    {
      reports: await attachReportCounts(reports),
      counts,
      pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
    },
    "Reports fetched"
  );
};

/**
 * @desc    Single report with session details
 * @route   GET /api/admin/reports/:id
 * @access  Admin
 */
const getReportById = async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    throw httpError("Invalid report ID", 400);
  }

  const report = await populateReport(Report.findById(req.params.id)).lean();
  if (!report) {
    throw httpError("Report not found", 404);
  }

  const [withCount] = await attachReportCounts([report]);
  return successResponse(res, { report: withCount }, "Report fetched");
};

/**
 * @desc    Resolve a pending report: dismiss, warn or suspend the reported user
 * @route   PATCH /api/admin/reports/:id
 * @body    { action: "dismiss"|"warn"|"suspend", adminNote?, suspendDays? }
 * @access  Admin
 */
const resolveReport = async (req, res) => {
  const { action, adminNote = "", suspendDays } = req.body;

  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    throw httpError("Invalid report ID", 400);
  }

  if (!RESOLVE_ACTIONS.includes(action)) {
    throw httpError(`Action must be one of: ${RESOLVE_ACTIONS.join(", ")}`, 400);
  }

  if (typeof adminNote !== "string" || adminNote.length > 1000) {
    throw httpError("Admin note must be text up to 1000 characters", 400);
  }

  // Blank/absent = permanent suspension.
  let days = null;
  if (action === "suspend" && suspendDays !== undefined && suspendDays !== null && suspendDays !== "") {
    days = Number(suspendDays);
    if (!Number.isInteger(days) || days < 1 || days > MAX_SUSPEND_DAYS) {
      throw httpError(`Suspension days must be a whole number from 1 to ${MAX_SUSPEND_DAYS}`, 400);
    }
  }

  const existing = await Report.findById(req.params.id).select("status reportedUser reporter reason");
  if (!existing) {
    throw httpError("Report not found", 404);
  }
  if (existing.status !== "pending") {
    throw httpError("This report has already been reviewed", 409);
  }

  if (action !== "dismiss") {
    const target = await User.findById(existing.reportedUser).select("role");
    if (!target) {
      throw httpError("The reported user no longer exists — dismiss this report instead", 404);
    }
    if (target.role === "admin") {
      throw httpError("Admin accounts cannot be warned or suspended", 400);
    }
  }

  // Atomically claim the report so two admins can't both action it.
  const claimed = await Report.findOneAndUpdate(
    { _id: existing._id, status: "pending" },
    {
      $set: {
        status: action === "dismiss" ? "dismissed" : "actioned",
        action: action === "warn" ? "warned" : action === "suspend" ? "suspended" : "none",
        adminNote: adminNote.trim(),
        reviewedBy: req.user.id,
        reviewedAt: new Date(),
      },
    },
    { new: true }
  );

  if (!claimed) {
    throw httpError("This report has already been reviewed", 409);
  }

  if (action === "warn") {
    await User.updateOne({ _id: existing.reportedUser }, { $inc: { warningsCount: 1 } });
    await createNotification({
      recipient: existing.reportedUser,
      type: "account_warning",
      message: "Your account received a warning for violating our community guidelines.",
    });
  }

  if (action === "suspend") {
    await suspendUser(existing.reportedUser, { days, reason: existing.reason });
  }

  // Close the loop with the reporter without revealing the outcome.
  try {
    await createNotification({
      recipient: existing.reporter,
      type: "report_reviewed",
      message: "Thanks for your report — our team has reviewed it.",
    });
  } catch (error) {
    console.error("Error notifying reporter:", error);
  }

  const report = await populateReport(Report.findById(claimed._id)).lean();
  const [withCount] = await attachReportCounts([report]);

  return successResponse(res, { report: withCount }, "Report resolved");
};

/**
 * @desc    Users currently suspended (for the unsuspend list)
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
  getReports,
  getReportById,
  resolveReport,
  getSuspendedUsers,
  unsuspendUser,
};
