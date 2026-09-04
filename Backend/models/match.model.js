const mongoose = require("mongoose");

/**
 * A Match is created when a PartnerRequest is accepted. It records the two
 * users who are now partners and links back to the request that formed it.
 */
const matchSchema = new mongoose.Schema({
    users: {
        type: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
                required: true,
            },
        ],
        validate: {
            validator: (value) => value.length === 2,
            message: "A match must have exactly two users",
        },
    },
    request: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "PartnerRequest",
        required: true,
    },
    status: {
        type: String,
        enum: ["active", "ended"],
        default: "active",
    },
},
{
    timestamps: true,
});

// Fast lookup of all matches a user belongs to.
matchSchema.index({ users: 1 });

// One match per originating request.
matchSchema.index({ request: 1 }, { unique: true });

const Match = mongoose.model("Match", matchSchema);

module.exports = Match;
