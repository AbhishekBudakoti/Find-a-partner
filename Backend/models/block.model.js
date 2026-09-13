const mongoose = require("mongoose");

/**
 * A Block records that `blocker` no longer wants any contact with `blocked`.
 * Blocks are enforced in BOTH directions (see services/block.service.js):
 * neither user can discover, request, or message the other.
 */
const blockSchema = new mongoose.Schema(
  {
    blocker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    blocked: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// One block per pair — blocking twice is a no-op, not a duplicate row.
blockSchema.index({ blocker: 1, blocked: 1 }, { unique: true });

// Fast "who has blocked me" lookup for the reverse direction.
blockSchema.index({ blocked: 1 });

const Block = mongoose.model("Block", blockSchema);

module.exports = Block;
