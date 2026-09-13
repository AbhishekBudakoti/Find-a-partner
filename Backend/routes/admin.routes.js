const express = require("express");

const {
  getReports,
  getReportById,
  resolveReport,
  getSuspendedUsers,
  unsuspendUser,
} = require("../controllers/admin.controller");
const asyncHandler = require("../middlewares/asyncHandler");
const { protect } = require("../middlewares/auth.middleware");
const { adminOnly } = require("../middlewares/admin.middleware");

const router = express.Router();

// Applied once to the whole router so no admin route can ship unprotected.
router.use(protect, adminOnly);

router.get("/reports", asyncHandler(getReports));
router.get("/reports/:id", asyncHandler(getReportById));
router.patch("/reports/:id", asyncHandler(resolveReport));

router.get("/users/suspended", asyncHandler(getSuspendedUsers));
router.patch("/users/:id/unsuspend", asyncHandler(unsuspendUser));

module.exports = router;
