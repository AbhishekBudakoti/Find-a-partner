const express = require("express");

const {
  getReports,
  getReportById,
  resolveReport,
  getStats,
} = require("../controllers/admin.controller");
const {
  getUsers,
  updateUserRole,
  suspendUserDirectly,
  getSuspendedUsers,
  unsuspendUser,
} = require("../controllers/adminUsers.controller");
const { getActivities, updateActivity } = require("../controllers/adminActivities.controller");
const { getSessions } = require("../controllers/adminSessions.controller");
const { getReviews, deleteReview } = require("../controllers/adminReviews.controller");
const asyncHandler = require("../middlewares/asyncHandler");
const { protect } = require("../middlewares/auth.middleware");
const { adminOnly } = require("../middlewares/admin.middleware");

const router = express.Router();

// Applied once to the whole router so no admin route can ship unprotected.
router.use(protect, adminOnly);

router.get("/stats", asyncHandler(getStats));

router.get("/reports", asyncHandler(getReports));
router.get("/reports/:id", asyncHandler(getReportById));
router.patch("/reports/:id", asyncHandler(resolveReport));

// Literal path stays above "/users/:id/..." so it is never read as a param.
router.get("/users/suspended", asyncHandler(getSuspendedUsers));
router.get("/users", asyncHandler(getUsers));
router.patch("/users/:id/role", asyncHandler(updateUserRole));
router.patch("/users/:id/suspend", asyncHandler(suspendUserDirectly));
router.patch("/users/:id/unsuspend", asyncHandler(unsuspendUser));

router.get("/activities", asyncHandler(getActivities));
router.patch("/activities/:id", asyncHandler(updateActivity));

router.get("/sessions", asyncHandler(getSessions));

router.get("/reviews", asyncHandler(getReviews));
router.delete("/reviews/:id", asyncHandler(deleteReview));

module.exports = router;
