const mongoose = require("mongoose");

const SESSION_STATUSES = {
  REQUESTED: "requested",
  ACCEPTED: "accepted",
  UPCOMING: "upcoming",
  ACTIVE: "active",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
};

/**
 * Valid transitions matrix:
 * requested  --accept--> accepted --(time)--> upcoming --(time)--> active --(time)--> completed
 *      │                    │                    │                  │
 *      └──reject/cancel─────┴────────────────────┴──────────────────┘──> cancelled
 *
 * completed & cancelled are terminal states.
 */
const ALLOWED_TRANSITIONS = {
  [SESSION_STATUSES.REQUESTED]: [SESSION_STATUSES.ACCEPTED, SESSION_STATUSES.CANCELLED],
  [SESSION_STATUSES.ACCEPTED]: [SESSION_STATUSES.UPCOMING, SESSION_STATUSES.COMPLETED, SESSION_STATUSES.CANCELLED],
  [SESSION_STATUSES.UPCOMING]: [SESSION_STATUSES.ACTIVE, SESSION_STATUSES.COMPLETED, SESSION_STATUSES.CANCELLED],
  [SESSION_STATUSES.ACTIVE]: [SESSION_STATUSES.COMPLETED, SESSION_STATUSES.CANCELLED],
  [SESSION_STATUSES.COMPLETED]: [],
  [SESSION_STATUSES.CANCELLED]: [],
};

/**
 * A Session represents a scheduled meetup between two matched partners for a specific activity.
 */
const sessionSchema = new mongoose.Schema(
  {
    match: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Match",
      required: true,
    },
    participants: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
      ],
      validate: {
        validator: (value) => Array.isArray(value) && value.length === 2,
        message: "A session must have exactly two participants",
      },
    },
    activity: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Activity",
      required: true,
    },
    proposedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    scheduledAt: {
      type: Date,
      required: true,
    },
    durationMinutes: {
      type: Number,
      default: 60,
      min: 15,
    },
    location: {
      name: { type: String },
      address: { type: String },
      coordinates: { type: [Number] },
    },
    status: {
      type: String,
      enum: Object.values(SESSION_STATUSES),
      default: SESSION_STATUSES.REQUESTED,
    },
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    cancelReason: {
      type: String,
    },
    reminderSent: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Fast lookup for "my sessions" list sorted by schedule
sessionSchema.index({ participants: 1, scheduledAt: -1 });

// Fast lookup for status sweep job
sessionSchema.index({ status: 1, scheduledAt: 1 });

/**
 * Single guard: Answers "is X -> Y legal?"
 */
sessionSchema.statics.isValidTransition = function (currentStatus, nextStatus) {
  if (!ALLOWED_TRANSITIONS[currentStatus]) return false;
  return ALLOWED_TRANSITIONS[currentStatus].includes(nextStatus);
};

/**
 * Validates a status transition and returns { valid: boolean, error?: string }
 */
sessionSchema.statics.validateStatusTransition = function (currentStatus, targetStatus) {
  if (!ALLOWED_TRANSITIONS[currentStatus]) {
    return { valid: false, error: `Invalid current session status: '${currentStatus}'` };
  }
  if (currentStatus === SESSION_STATUSES.COMPLETED || currentStatus === SESSION_STATUSES.CANCELLED) {
    return { valid: false, error: `Cannot transition out of terminal status '${currentStatus}'` };
  }
  if (!ALLOWED_TRANSITIONS[currentStatus].includes(targetStatus)) {
    return {
      valid: false,
      error: `Illegal status transition from '${currentStatus}' to '${targetStatus}'`,
    };
  }
  return { valid: true };
};

/**
 * Guard: Only proposedBy's partner can accept/reject.
 * The proposer accepting their own session is forbidden.
 */
sessionSchema.statics.validateCanAcceptOrReject = function (session, userId) {
  const userIdStr = userId.toString();
  const proposedByStr = session.proposedBy ? session.proposedBy.toString() : "";
  const participantsStr = (session.participants || []).map((p) => p.toString());

  if (!participantsStr.includes(userIdStr)) {
    return { valid: false, error: "User is not a participant in this session" };
  }
  if (userIdStr === proposedByStr) {
    return { valid: false, error: "The proposer cannot accept or reject their own proposed session" };
  }
  return { valid: true };
};

/**
 * Guard for creation:
 * 1. Reject scheduledAt in the past on create.
 * 2. The match must be status: "active" - don't let ended partnerships schedule.
 */
sessionSchema.statics.validateCreation = function (scheduledAt, match) {
  const scheduledDate = new Date(scheduledAt);
  if (isNaN(scheduledDate.getTime()) || scheduledDate <= new Date()) {
    return { valid: false, error: "Session scheduledAt date must be in the future" };
  }
  if (!match) {
    return { valid: false, error: "Match not found" };
  }
  if (match.status !== "active") {
    return { valid: false, error: "Cannot schedule a session for a match that is not active" };
  }
  return { valid: true };
};

sessionSchema.methods.canTransitionTo = function (nextStatus) {
  return mongoose.model("Session").isValidTransition(this.status, nextStatus);
};

const Session = mongoose.model("Session", sessionSchema);

Session.SESSION_STATUSES = SESSION_STATUSES;
Session.ALLOWED_TRANSITIONS = ALLOWED_TRANSITIONS;

module.exports = Session;
