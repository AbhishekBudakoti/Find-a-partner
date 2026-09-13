const User = require("../models/user.model");
const Session = require("../models/session.model");
const { getUserSocketIds } = require("./presence.service");
const { createNotification } = require("./notification.service");

const SUSPENDED_ERROR_CODE = "ACCOUNT_SUSPENDED";

const OPEN_SESSION_STATUSES = [
  Session.SESSION_STATUSES.REQUESTED,
  Session.SESSION_STATUSES.ACCEPTED,
  Session.SESSION_STATUSES.UPCOMING,
  Session.SESSION_STATUSES.ACTIVE,
];

/**
 * Returns the user's suspension if it is still in force, or null.
 * A timed suspension whose end date has passed is lifted on the spot, so no
 * background job is needed to un-suspend users.
 *
 * @param {Object} user - User document with isSuspended/suspendedUntil/suspensionReason
 * @returns {Promise<{ until: Date|null, reason: string }|null>}
 */
const getActiveSuspension = async (user) => {
  if (!user?.isSuspended) {
    return null;
  }

  if (user.suspendedUntil && user.suspendedUntil <= new Date()) {
    await User.updateOne(
      { _id: user._id },
      { $set: { isSuspended: false, suspendedUntil: null, suspensionReason: "" } }
    );
    user.isSuspended = false;
    user.suspendedUntil = null;
    user.suspensionReason = "";
    return null;
  }

  return {
    until: user.suspendedUntil || null,
    reason: user.suspensionReason || "",
  };
};

/**
 * Builds the 403 error thrown for suspended accounts. The `errorCode` lets the
 * frontend log the user out instead of showing a generic failure.
 */
const buildSuspendedError = (suspension) => {
  const untilText = suspension.until
    ? ` until ${suspension.until.toISOString().slice(0, 10)}`
    : "";
  const error = new Error(`Your account is suspended${untilText}`);
  error.statusCode = 403;
  error.errorCode = SUSPENDED_ERROR_CODE;
  return error;
};

/**
 * Force-disconnects every live socket the user has, so a suspension takes
 * effect immediately rather than when they next reload.
 */
const disconnectUserSockets = (userId) => {
  // Lazy require avoids a circular import with socket/socket.js.
  const io = require("../socket/socket").getIO();
  if (!io) return;

  getUserSocketIds(userId.toString()).forEach((socketId) => {
    io.sockets.sockets.get(socketId)?.disconnect(true);
  });
};

/**
 * Suspends a user: marks the account, cancels their unfinished sessions
 * (telling the partners with a neutral message) and kicks their sockets.
 *
 * @param {string} userId
 * @param {{ days?: number|null, reason?: string }} options - days omitted = permanent
 */
const suspendUser = async (userId, { days = null, reason = "" } = {}) => {
  const suspendedUntil = days ? new Date(Date.now() + days * 24 * 60 * 60 * 1000) : null;

  await User.updateOne(
    { _id: userId },
    { $set: { isSuspended: true, suspendedUntil, suspensionReason: reason } }
  );

  const openSessions = await Session.find({
    participants: userId,
    status: { $in: OPEN_SESSION_STATUSES },
  }).select("_id participants");

  if (openSessions.length > 0) {
    await Session.updateMany(
      { _id: { $in: openSessions.map((s) => s._id) } },
      { $set: { status: Session.SESSION_STATUSES.CANCELLED, cancelReason: "Cancelled" } }
    );

    const io = require("../socket/socket").getIO();

    for (const session of openSessions) {
      io?.to(`session:${session._id}`).emit("session:updated", {
        sessionId: session._id,
        status: Session.SESSION_STATUSES.CANCELLED,
        cancelReason: "Cancelled",
      });

      const partnerId = session.participants.find((p) => p.toString() !== userId.toString());
      if (partnerId) {
        try {
          await createNotification({
            recipient: partnerId,
            type: "session_cancelled",
            message: "A scheduled session was cancelled because your partner is unavailable.",
            relatedSession: session._id,
          });
        } catch (error) {
          console.error("Error notifying partner of suspension cancellation:", error);
        }
      }
    }
  }

  disconnectUserSockets(userId);

  return { suspendedUntil, cancelledSessions: openSessions.length };
};

module.exports = {
  SUSPENDED_ERROR_CODE,
  getActiveSuspension,
  buildSuspendedError,
  disconnectUserSockets,
  suspendUser,
};
