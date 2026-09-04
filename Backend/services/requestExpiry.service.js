const PartnerRequest = require("../models/partnerRequest.model");

/**
 * Flips any pending partner request whose expireAt has passed to "expired".
 *
 * A cron-style sweep is used instead of a MongoDB TTL index because a TTL index
 * would delete the whole document (losing history, and breaking chat auth which
 * relies on accepted PartnerRequest docs) rather than moving it to the "expired"
 * state the schema enum defines.
 *
 * @returns {Promise<number>} Number of requests transitioned to "expired".
 */
const expireStaleRequests = async () => {
    const result = await PartnerRequest.updateMany(
        { status: "pending", expireAt: { $lte: new Date() } },
        { $set: { status: "expired" } }
    );

    return result.modifiedCount || 0;
};

let timer = null;
let running = false;

/**
 * Starts a recurring background job that expires stale pending requests.
 * Runs once immediately, then on the given interval. Safe to call once at boot.
 *
 * @param {number} [intervalMs=3600000] - Sweep interval in milliseconds (default 1h).
 */
const startRequestExpiryJob = (intervalMs = 60 * 60 * 1000) => {
    if (timer) {
        return;
    }

    const sweep = async () => {
        if (running) {
            return;
        }
        running = true;
        try {
            const count = await expireStaleRequests();
            if (count > 0) {
                console.log(`[requestExpiry] marked ${count} request(s) as expired`);
            }
        } catch (error) {
            console.error(`[requestExpiry] sweep failed: ${error.message}`);
        } finally {
            running = false;
        }
    };

    sweep();
    timer = setInterval(sweep, intervalMs);
    // Don't keep the process alive just for this timer.
    if (typeof timer.unref === "function") {
        timer.unref();
    }
};

module.exports = {
    expireStaleRequests,
    startRequestExpiryJob,
};
