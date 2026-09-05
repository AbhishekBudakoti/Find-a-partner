const Session = require("../models/session.model");
const { createNotification } = require("./notification.service");
const { getIO } = require("../socket/socket");

/**
 * Sweeps sessions to transition their status as time passes and send reminders:
 * 1. accepted -> upcoming (when scheduledAt is within 24 hours)
 * 2. upcoming -> active (when now >= scheduledAt)
 * 3. active -> completed (when now >= scheduledAt + durationMinutes)
 * 4. Reminders: Sends notifications & room events for sessions starting within 30 min.
 *
 * @returns {Promise<{ upcomingCount: number, activeCount: number, completedCount: number, reminderCount: number }>}
 */
const sweepSessionLifecycle = async () => {
  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const in30min = new Date(now.getTime() + 30 * 60 * 1000);

  // 1. accepted -> upcoming (when scheduledAt <= now + 24h)
  const upcomingResult = await Session.updateMany(
    {
      status: Session.SESSION_STATUSES.ACCEPTED,
      scheduledAt: { $lte: in24h },
    },
    { $set: { status: Session.SESSION_STATUSES.UPCOMING } }
  );

  // 2. upcoming -> active (when now >= scheduledAt)
  const activeResult = await Session.updateMany(
    {
      status: Session.SESSION_STATUSES.UPCOMING,
      scheduledAt: { $lte: now },
    },
    { $set: { status: Session.SESSION_STATUSES.ACTIVE } }
  );

  // 3. active -> completed (when now >= scheduledAt + durationMinutes)
  const completedResult = await Session.updateMany(
    {
      status: Session.SESSION_STATUSES.ACTIVE,
      $expr: {
        $lte: [
          { $add: ["$scheduledAt", { $multiply: ["$durationMinutes", 60, 1000] }] },
          now,
        ],
      },
    },
    { $set: { status: Session.SESSION_STATUSES.COMPLETED } }
  );

  // 4. Reminders (sessions starting within 30 minutes)
  let reminderCount = 0;
  const sessionsToRemind = await Session.find({
    status: { $in: [Session.SESSION_STATUSES.ACCEPTED, Session.SESSION_STATUSES.UPCOMING] },
    scheduledAt: { $gte: now, $lte: in30min },
    reminderSent: { $ne: true },
  });

  const io = getIO();

  for (const session of sessionsToRemind) {
    session.reminderSent = true;
    await session.save();
    reminderCount++;

    for (const participantId of session.participants || []) {
      try {
        await createNotification({
          recipient: participantId.toString(),
          sender: null,
          type: "session_reminder",
          message: "Your scheduled session starts in less than 30 minutes!",
          relatedSession: session._id,
        });
      } catch (err) {
        console.error(`Error sending reminder notification to ${participantId}:`, err);
      }
    }

    if (io) {
      io.to(`session:${session._id}`).emit("session:reminder", {
        sessionId: session._id,
        scheduledAt: session.scheduledAt,
        message: "Your scheduled session starts in less than 30 minutes!",
      });
    }
  }

  return {
    upcomingCount: upcomingResult.modifiedCount || 0,
    activeCount: activeResult.modifiedCount || 0,
    completedCount: completedResult.modifiedCount || 0,
    reminderCount,
  };
};

let timer = null;
let running = false;

/**
 * Starts a recurring background job that sweeps session statuses.
 * Runs once immediately, then on the given interval (default 5 minutes).
 * Safe to call once at boot.
 *
 * @param {number} [intervalMs=300000] - Sweep interval in milliseconds (default 5 min).
 */
const startSessionLifecycleJob = (intervalMs = 5 * 60 * 1000) => {
  if (timer) {
    return;
  }

  const sweep = async () => {
    if (running) {
      return;
    }
    running = true;
    try {
      const { upcomingCount, activeCount, completedCount, reminderCount } =
        await sweepSessionLifecycle();
      const total = upcomingCount + activeCount + completedCount + reminderCount;
      if (total > 0) {
        console.log(
          `[sessionLifecycle] transitioned ${upcomingCount} upcoming, ${activeCount} active, ${completedCount} completed, ${reminderCount} reminders sent`
        );
      }
    } catch (error) {
      console.error(`[sessionLifecycle] sweep failed: ${error.message}`);
    } finally {
      running = false;
    }
  };

  sweep();
  timer = setInterval(sweep, intervalMs);
  if (typeof timer.unref === "function") {
    timer.unref();
  }
};

module.exports = {
  sweepSessionLifecycle,
  startSessionLifecycleJob,
};
