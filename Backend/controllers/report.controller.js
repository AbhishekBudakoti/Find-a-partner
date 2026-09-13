const mongoose = require("mongoose");

const Report = require("../models/report.model");
const Session = require("../models/session.model");
const User = require("../models/user.model");
const { successResponse } = require("../utils/response");
const { blockUser } = require("../services/block.service");

// Anti-abuse: cap how many reports one user can file per rolling 24 hours.
const DAILY_REPORT_LIMIT = 10;

const httpError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

/**
 * @desc    Report another user for moderator review
 * @route   POST /api/reports
 * @access  Private
 */
const createReport = async (req, res) => {
  const { reportedUser, reason, details = "", session, alsoBlock } = req.body;
  const reporterId = req.user.id;

  if (!reportedUser || !mongoose.Types.ObjectId.isValid(reportedUser)) {
    throw httpError("Invalid user ID", 400);
  }

  if (reportedUser.toString() === reporterId) {
    throw httpError("You cannot report yourself", 400);
  }

  if (!Report.REPORT_REASONS.includes(reason)) {
    throw httpError("Invalid report reason", 400);
  }

  if (typeof details !== "string") {
    throw httpError("Details must be text", 400);
  }

  const targetExists = await User.exists({ _id: reportedUser });
  if (!targetExists) {
    throw httpError("User not found", 404);
  }

  // A no-show only makes sense against a specific meetup.
  if (reason === "no_show" && !session) {
    throw httpError("A no-show report must reference a session", 400);
  }

  if (session) {
    if (!mongoose.Types.ObjectId.isValid(session)) {
      throw httpError("Invalid session ID", 400);
    }

    const sessionDoc = await Session.findById(session).select("participants");
    if (!sessionDoc) {
      throw httpError("Session not found", 404);
    }

    const participantIds = sessionDoc.participants.map((p) => p.toString());
    if (!participantIds.includes(reporterId) || !participantIds.includes(reportedUser.toString())) {
      throw httpError("You can only report the other participant of your own session", 403);
    }
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentReports = await Report.countDocuments({
    reporter: reporterId,
    createdAt: { $gte: since },
  });
  if (recentReports >= DAILY_REPORT_LIMIT) {
    throw httpError("You've reached the daily report limit. Please try again later.", 429);
  }

  // Checked up front for a readable message; the partial unique index still
  // guards against two simultaneous submissions.
  const alreadyPending = await Report.exists({
    reporter: reporterId,
    reportedUser,
    status: "pending",
  });
  if (alreadyPending) {
    throw httpError("You've already reported this user. Our team is reviewing it.", 409);
  }

  let report;
  try {
    report = await Report.create({
      reporter: reporterId,
      reportedUser,
      reason,
      details,
      session: session || null,
    });
  } catch (error) {
    if (error.code === 11000) {
      throw httpError("You've already reported this user. Our team is reviewing it.", 409);
    }
    throw error;
  }

  let blocked = false;
  if (alsoBlock === true) {
    await blockUser(reporterId, reportedUser);
    blocked = true;
  }

  return successResponse(
    res,
    {
      report: { _id: report._id, status: report.status, reason: report.reason },
      blocked,
    },
    "Thanks — our team will review this report",
    201
  );
};

module.exports = {
  createReport,
};
