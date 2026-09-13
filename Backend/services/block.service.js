const mongoose = require("mongoose");

const Block = require("../models/block.model");
const Match = require("../models/match.model");
const PartnerRequest = require("../models/partnerRequest.model");
const Session = require("../models/session.model");
const User = require("../models/user.model");

// Sessions that haven't finished yet and must be called off when a pair is blocked.
const OPEN_SESSION_STATUSES = [
  Session.SESSION_STATUSES.REQUESTED,
  Session.SESSION_STATUSES.ACCEPTED,
  Session.SESSION_STATUSES.UPCOMING,
  Session.SESSION_STATUSES.ACTIVE,
];

const httpError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

/**
 * Every user hidden from `userId` because of a block in EITHER direction:
 * people they blocked plus people who blocked them.
 *
 * @param {string} userId
 * @returns {Promise<mongoose.Types.ObjectId[]>}
 */
const getBlockedUserIds = async (userId) => {
  const blocks = await Block.find({
    $or: [{ blocker: userId }, { blocked: userId }],
  })
    .select("blocker blocked")
    .lean();

  return blocks.map((block) =>
    block.blocker.toString() === userId.toString() ? block.blocked : block.blocker
  );
};

/**
 * Users who should never appear in discovery for `userId`: blocked users in
 * either direction plus anyone currently serving a suspension.
 *
 * @param {string} userId
 * @returns {Promise<mongoose.Types.ObjectId[]>}
 */
const getHiddenUserIds = async (userId) => {
  const [blockedIds, suspendedIds] = await Promise.all([
    getBlockedUserIds(userId),
    User.find({
      isSuspended: true,
      $or: [{ suspendedUntil: null }, { suspendedUntil: { $gt: new Date() } }],
    }).distinct("_id"),
  ]);

  return [...blockedIds, ...suspendedIds];
};

/**
 * True when a block exists between the two users in either direction.
 */
const isBlockedBetween = async (userA, userB) => {
  const block = await Block.exists({
    $or: [
      { blocker: userA, blocked: userB },
      { blocker: userB, blocked: userA },
    ],
  });

  return Boolean(block);
};

/**
 * Chat is allowed only between users with an ACTIVE match and no block.
 * (An accepted request alone isn't enough: blocking ends the match but the
 * old accepted request stays on file.)
 */
const canUsersMessage = async (userA, userB) => {
  if (!mongoose.Types.ObjectId.isValid(userA) || !mongoose.Types.ObjectId.isValid(userB)) {
    return false;
  }

  const [activeMatch, blocked] = await Promise.all([
    Match.exists({ users: { $all: [userA, userB] }, status: "active" }),
    isBlockedBetween(userA, userB),
  ]);

  return Boolean(activeMatch) && !blocked;
};

/**
 * Blocks `blockedId` on behalf of `blockerId` and tears down everything that
 * connects the pair: the active match ends, pending requests are cancelled
 * and unfinished sessions are cancelled.
 *
 * Blocking is SILENT — the blocked user gets no notification and the cancel
 * reason is deliberately neutral, so it can't be used to provoke retaliation.
 *
 * @returns {Promise<{ cancelledSessions: number }>}
 */
const blockUser = async (blockerId, blockedId) => {
  if (!mongoose.Types.ObjectId.isValid(blockedId)) {
    throw httpError("Invalid user ID", 400);
  }

  if (blockerId.toString() === blockedId.toString()) {
    throw httpError("You cannot block yourself", 400);
  }

  const targetExists = await User.exists({ _id: blockedId });
  if (!targetExists) {
    throw httpError("User not found", 404);
  }

  try {
    // Upsert keeps blocking idempotent: blocking twice is not an error.
    await Block.updateOne(
      { blocker: blockerId, blocked: blockedId },
      { $setOnInsert: { blocker: blockerId, blocked: blockedId } },
      { upsert: true }
    );
  } catch (error) {
    // Two simultaneous block requests can race on the unique index; the
    // block exists either way, so the loser can safely carry on.
    if (error.code !== 11000) throw error;
  }

  const pair = [blockerId, blockedId];

  await Promise.all([
    Match.updateMany(
      { users: { $all: pair }, status: "active" },
      { $set: { status: "ended" } }
    ),
    PartnerRequest.updateMany(
      {
        status: "pending",
        $or: [
          { sender: blockerId, recipient: blockedId },
          { sender: blockedId, recipient: blockerId },
        ],
      },
      { $set: { status: "cancelled" } }
    ),
  ]);

  const openSessions = await Session.find({
    participants: { $all: pair },
    status: { $in: OPEN_SESSION_STATUSES },
  }).select("_id");

  if (openSessions.length > 0) {
    await Session.updateMany(
      { _id: { $in: openSessions.map((s) => s._id) } },
      { $set: { status: Session.SESSION_STATUSES.CANCELLED, cancelReason: "Cancelled" } }
    );

    // Required lazily: socket.js requires this service, so a top-level
    // require would hand us a half-initialised module (circular import).
    const io = require("../socket/socket").getIO();
    if (io) {
      openSessions.forEach((session) => {
        io.to(`session:${session._id}`).emit("session:updated", {
          sessionId: session._id,
          status: Session.SESSION_STATUSES.CANCELLED,
          cancelReason: "Cancelled",
        });
      });
    }
  }

  return { cancelledSessions: openSessions.length };
};

/**
 * Removes the caller's block. Does NOT restore the ended match — the users
 * have to send a new partner request if they want to reconnect.
 *
 * @returns {Promise<boolean>} true when a block was removed
 */
const unblockUser = async (blockerId, blockedId) => {
  if (!mongoose.Types.ObjectId.isValid(blockedId)) {
    throw httpError("Invalid user ID", 400);
  }

  const result = await Block.deleteOne({ blocker: blockerId, blocked: blockedId });
  return result.deletedCount > 0;
};

module.exports = {
  getBlockedUserIds,
  getHiddenUserIds,
  isBlockedBetween,
  canUsersMessage,
  blockUser,
  unblockUser,
};
