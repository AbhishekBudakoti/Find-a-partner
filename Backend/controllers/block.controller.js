const Block = require("../models/block.model");
const { successResponse } = require("../utils/response");
const { blockUser, unblockUser } = require("../services/block.service");

/**
 * @desc    Block a user (silent — the blocked user is not notified)
 * @route   POST /api/blocks/:userId
 * @access  Private
 */
const createBlock = async (req, res) => {
  const result = await blockUser(req.user.id, req.params.userId);

  return successResponse(
    res,
    { blockedUserId: req.params.userId, ...result },
    "User blocked",
    201
  );
};

/**
 * @desc    Unblock a user (the ended match is NOT restored)
 * @route   DELETE /api/blocks/:userId
 * @access  Private
 */
const removeBlock = async (req, res) => {
  const removed = await unblockUser(req.user.id, req.params.userId);

  if (!removed) {
    const error = new Error("You haven't blocked this user");
    error.statusCode = 404;
    throw error;
  }

  return successResponse(res, { unblockedUserId: req.params.userId }, "User unblocked");
};

/**
 * @desc    List users the current user has blocked
 * @route   GET /api/blocks
 * @access  Private
 */
const getMyBlocks = async (req, res) => {
  const blocks = await Block.find({ blocker: req.user.id })
    .populate("blocked", "name email")
    .sort({ createdAt: -1 });

  const users = blocks
    .filter((block) => block.blocked) // skip blocks whose user was deleted
    .map((block) => ({
      _id: block.blocked._id,
      name: block.blocked.name,
      email: block.blocked.email,
      blockedAt: block.createdAt,
    }));

  return successResponse(res, { count: users.length, users }, "Blocked users fetched");
};

module.exports = {
  createBlock,
  removeBlock,
  getMyBlocks,
};
