const mongoose = require("mongoose");

const REPORT_REASONS = [
  "harassment",
  "spam",
  "fake_profile",
  "no_show",
  "inappropriate",
  "unsafe_behaviour",
  "other",
];

const REPORT_STATUSES = ["pending", "dismissed", "actioned"];

const REPORT_ACTIONS = ["none", "warned", "suspended"];

/**
 * A Report is a user flagging another user for moderator review.
 * Reports start `pending`; an admin resolves them as `dismissed` or
 * `actioned` (with the action taken recorded in `action`).
 */
const reportSchema = new mongoose.Schema(
  {
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reportedUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reason: {
      type: String,
      enum: REPORT_REASONS,
      required: true,
    },
    details: {
      type: String,
      trim: true,
      maxlength: [1000, "Details cannot exceed 1000 characters"],
      default: "",
    },
    session: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Session",
      default: null,
    },
    status: {
      type: String,
      enum: REPORT_STATUSES,
      default: "pending",
    },
    action: {
      type: String,
      enum: REPORT_ACTIONS,
      default: "none",
    },
    adminNote: {
      type: String,
      trim: true,
      maxlength: [1000, "Admin note cannot exceed 1000 characters"],
      default: "",
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// At most ONE pending report per reporter -> target. Once an admin reviews it,
// the partial filter no longer matches, so the reporter may report again.
reportSchema.index(
  { reporter: 1, reportedUser: 1 },
  { unique: true, partialFilterExpression: { status: "pending" } }
);

// Admin queue: newest reports per status.
reportSchema.index({ status: 1, createdAt: -1 });

// "How many times has this user been reported?"
reportSchema.index({ reportedUser: 1 });

const Report = mongoose.model("Report", reportSchema);

Report.REPORT_REASONS = REPORT_REASONS;
Report.REPORT_STATUSES = REPORT_STATUSES;
Report.REPORT_ACTIONS = REPORT_ACTIONS;

module.exports = Report;
