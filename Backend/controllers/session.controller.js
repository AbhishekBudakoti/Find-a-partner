const mongoose = require("mongoose");
const Session = require("../models/session.model");
const Match = require("../models/match.model");
const asyncHandler = require("../middlewares/asyncHandler");
const { successResponse } = require("../utils/response");
const { createNotification } = require("../services/notification.service");
const { getIO } = require("../socket/socket");

/**
 * Helper to get current user ID string from req.user
 */
const getCurrentUserId = (req) => {
  return (req.user?.id || req.user?._id || "").toString();
};

/**
 * @desc    Propose a new session
 * @route   POST /api/sessions
 * @access  Private
 */
const proposeSession = asyncHandler(async (req, res) => {
  const { match: matchId, activity, scheduledAt, durationMinutes, location } = req.body;
  const currentUserId = getCurrentUserId(req);

  if (!matchId || !activity || !scheduledAt) {
    const error = new Error("Match, activity, and scheduledAt are required");
    error.statusCode = 400;
    throw error;
  }

  if (!mongoose.Types.ObjectId.isValid(matchId)) {
    const error = new Error("Invalid match ID");
    error.statusCode = 400;
    throw error;
  }

  const match = await Match.findById(matchId);
  if (!match) {
    const error = new Error("Match not found");
    error.statusCode = 404;
    throw error;
  }

  const isParticipant = (match.users || []).some(
    (u) => u.toString() === currentUserId
  );
  if (!isParticipant) {
    const error = new Error("You are not a participant in this match");
    error.statusCode = 403;
    throw error;
  }

  const creationValidation = Session.validateCreation(scheduledAt, match);
  if (!creationValidation.valid) {
    const error = new Error(creationValidation.error);
    error.statusCode = 400;
    throw error;
  }

  const session = await Session.create({
    match: match._id,
    participants: match.users,
    activity,
    proposedBy: currentUserId,
    scheduledAt,
    durationMinutes: durationMinutes || 60,
    location,
    status: Session.SESSION_STATUSES.REQUESTED,
  });

  const partnerId = (match.users || []).find((u) => u.toString() !== currentUserId);
  if (partnerId) {
    try {
      await createNotification({
        recipient: partnerId,
        sender: currentUserId,
        type: "session_proposed",
        message: "Proposed a new session with you",
        relatedSession: session._id,
      });
    } catch (err) {
      console.error("Error creating session_proposed notification:", err);
    }
  }

  const populatedSession = await Session.findById(session._id)
    .populate("match")
    .populate("participants", "name email")
    .populate("activity", "name")
    .populate("proposedBy", "name email");

  return successResponse(res, populatedSession, "Session proposed successfully", 201);
});

/**
 * @desc    Get user's sessions (supports ?status= and ?upcoming=true)
 * @route   GET /api/sessions
 * @access  Private
 */
const getSessions = asyncHandler(async (req, res) => {
  const currentUserId = getCurrentUserId(req);

  // Security: Always filter by req.user ID; ignore user ID from query string
  const filter = {
    participants: currentUserId,
  };

  if (req.query.status) {
    filter.status = req.query.status;
  }

  if (req.query.upcoming === "true" || req.query.upcoming === "1") {
    filter.scheduledAt = { $gte: new Date() };
  }

  const sessions = await Session.find(filter)
    .populate("match")
    .populate("participants", "name email")
    .populate("activity", "name")
    .populate("proposedBy", "name email")
    .populate("cancelledBy", "name email")
    .sort({ scheduledAt: -1 });

  return successResponse(
    res,
    { count: sessions.length, sessions },
    "Sessions retrieved successfully"
  );
});

/**
 * @desc    Get single session by ID
 * @route   GET /api/sessions/:id
 * @access  Private
 */
const getSessionById = asyncHandler(async (req, res) => {
  const currentUserId = getCurrentUserId(req);

  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    const error = new Error("Invalid session ID");
    error.statusCode = 400;
    throw error;
  }

  const session = await Session.findById(req.params.id)
    .populate("match")
    .populate("participants", "name email")
    .populate("activity", "name")
    .populate("proposedBy", "name email")
    .populate("cancelledBy", "name email");

  if (!session) {
    const error = new Error("Session not found");
    error.statusCode = 404;
    throw error;
  }

  const isParticipant = (session.participants || []).some(
    (p) => (p._id || p).toString() === currentUserId
  );

  if (!isParticipant) {
    const error = new Error("Access denied to this session");
    error.statusCode = 403;
    throw error;
  }

  return successResponse(res, session, "Session retrieved successfully");
});

/**
 * Helper to emit room updates to connected sockets in session room
 */
const emitSessionRoomUpdate = (session) => {
  const io = getIO();
  if (io) {
    io.to(`session:${session._id}`).emit("session:updated", {
      sessionId: session._id,
      status: session.status,
      updatedAt: session.updatedAt,
      cancelledBy: session.cancelledBy,
      cancelReason: session.cancelReason,
    });
  }
};

/**
 * @desc    Partner accepts proposed session
 * @route   PATCH /api/sessions/:id/accept
 * @access  Private
 */
const acceptSession = asyncHandler(async (req, res) => {
  const currentUserId = getCurrentUserId(req);

  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    const error = new Error("Invalid session ID");
    error.statusCode = 400;
    throw error;
  }

  const session = await Session.findById(req.params.id);
  if (!session) {
    const error = new Error("Session not found");
    error.statusCode = 404;
    throw error;
  }

  const acceptGuard = Session.validateCanAcceptOrReject(session, currentUserId);
  if (!acceptGuard.valid) {
    const error = new Error(acceptGuard.error);
    error.statusCode = 400;
    throw error;
  }

  const transitionGuard = Session.validateStatusTransition(
    session.status,
    Session.SESSION_STATUSES.ACCEPTED
  );
  if (!transitionGuard.valid) {
    const error = new Error(transitionGuard.error);
    error.statusCode = 400;
    throw error;
  }

  session.status = Session.SESSION_STATUSES.ACCEPTED;
  await session.save();

  emitSessionRoomUpdate(session);

  const proposerId = session.proposedBy ? session.proposedBy.toString() : null;
  if (proposerId && proposerId !== currentUserId) {
    try {
      await createNotification({
        recipient: proposerId,
        sender: currentUserId,
        type: "session_accepted",
        message: "Accepted your proposed session",
        relatedSession: session._id,
      });
    } catch (err) {
      console.error("Error creating session_accepted notification:", err);
    }
  }

  const updated = await Session.findById(session._id)
    .populate("match")
    .populate("participants", "name email")
    .populate("activity", "name")
    .populate("proposedBy", "name email");

  return successResponse(res, updated, "Session accepted successfully");
});

/**
 * @desc    Partner rejects proposed session
 * @route   PATCH /api/sessions/:id/reject
 * @access  Private
 */
const rejectSession = asyncHandler(async (req, res) => {
  const currentUserId = getCurrentUserId(req);

  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    const error = new Error("Invalid session ID");
    error.statusCode = 400;
    throw error;
  }

  const session = await Session.findById(req.params.id);
  if (!session) {
    const error = new Error("Session not found");
    error.statusCode = 404;
    throw error;
  }

  const rejectGuard = Session.validateCanAcceptOrReject(session, currentUserId);
  if (!rejectGuard.valid) {
    const error = new Error(rejectGuard.error);
    error.statusCode = 400;
    throw error;
  }

  const transitionGuard = Session.validateStatusTransition(
    session.status,
    Session.SESSION_STATUSES.CANCELLED
  );
  if (!transitionGuard.valid) {
    const error = new Error(transitionGuard.error);
    error.statusCode = 400;
    throw error;
  }

  session.status = Session.SESSION_STATUSES.CANCELLED;
  session.cancelledBy = currentUserId;
  session.cancelReason = req.body.cancelReason || "Declined by partner";
  await session.save();

  emitSessionRoomUpdate(session);

  const proposerId = session.proposedBy ? session.proposedBy.toString() : null;
  if (proposerId && proposerId !== currentUserId) {
    try {
      await createNotification({
        recipient: proposerId,
        sender: currentUserId,
        type: "session_rejected",
        message: "Declined your proposed session",
        relatedSession: session._id,
      });
    } catch (err) {
      console.error("Error creating session_rejected notification:", err);
    }
  }

  const updated = await Session.findById(session._id)
    .populate("match")
    .populate("participants", "name email")
    .populate("activity", "name")
    .populate("proposedBy", "name email")
    .populate("cancelledBy", "name email");

  return successResponse(res, updated, "Session rejected successfully");
});

/**
 * @desc    Either participant cancels session (before completed)
 * @route   PATCH /api/sessions/:id/cancel
 * @access  Private
 */
const cancelSession = asyncHandler(async (req, res) => {
  const currentUserId = getCurrentUserId(req);

  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    const error = new Error("Invalid session ID");
    error.statusCode = 400;
    throw error;
  }

  const session = await Session.findById(req.params.id);
  if (!session) {
    const error = new Error("Session not found");
    error.statusCode = 404;
    throw error;
  }

  const isParticipant = (session.participants || []).some(
    (p) => p.toString() === currentUserId
  );
  if (!isParticipant) {
    const error = new Error("Access denied to this session");
    error.statusCode = 403;
    throw error;
  }

  const transitionGuard = Session.validateStatusTransition(
    session.status,
    Session.SESSION_STATUSES.CANCELLED
  );
  if (!transitionGuard.valid) {
    const error = new Error(transitionGuard.error);
    error.statusCode = 400;
    throw error;
  }

  session.status = Session.SESSION_STATUSES.CANCELLED;
  session.cancelledBy = currentUserId;
  session.cancelReason = req.body.cancelReason || "Cancelled by participant";
  await session.save();

  emitSessionRoomUpdate(session);

  const partnerId = (session.participants || []).find((p) => p.toString() !== currentUserId);
  if (partnerId) {
    try {
      await createNotification({
        recipient: partnerId,
        sender: currentUserId,
        type: "session_cancelled",
        message: "Cancelled the scheduled session",
        relatedSession: session._id,
      });
    } catch (err) {
      console.error("Error creating session_cancelled notification:", err);
    }
  }

  const updated = await Session.findById(session._id)
    .populate("match")
    .populate("participants", "name email")
    .populate("activity", "name")
    .populate("proposedBy", "name email")
    .populate("cancelledBy", "name email");

  return successResponse(res, updated, "Session cancelled successfully");
});

/**
 * @desc    Mark session as completed ("we actually did this")
 * @route   PATCH /api/sessions/:id/complete
 * @access  Private
 */
const completeSession = asyncHandler(async (req, res) => {
  const currentUserId = getCurrentUserId(req);

  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    const error = new Error("Invalid session ID");
    error.statusCode = 400;
    throw error;
  }

  const session = await Session.findById(req.params.id);
  if (!session) {
    const error = new Error("Session not found");
    error.statusCode = 404;
    throw error;
  }

  const isParticipant = (session.participants || []).some(
    (p) => p.toString() === currentUserId
  );
  if (!isParticipant) {
    const error = new Error("Access denied to this session");
    error.statusCode = 403;
    throw error;
  }

  const transitionGuard = Session.validateStatusTransition(
    session.status,
    Session.SESSION_STATUSES.COMPLETED
  );
  if (!transitionGuard.valid) {
    const error = new Error(transitionGuard.error);
    error.statusCode = 400;
    throw error;
  }

  session.status = Session.SESSION_STATUSES.COMPLETED;
  await session.save();

  emitSessionRoomUpdate(session);

  const updated = await Session.findById(session._id)
    .populate("match")
    .populate("participants", "name email")
    .populate("activity", "name")
    .populate("proposedBy", "name email");

  return successResponse(res, updated, "Session marked as completed successfully");
});

module.exports = {
  proposeSession,
  getSessions,
  getSessionById,
  acceptSession,
  rejectSession,
  cancelSession,
  completeSession,
};
