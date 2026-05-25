const express = require("express");
const { requireChatAuth } = require("../middleware/chat-auth.middleware");
const { asyncHandler } = require("../utils/async-handler");
const chatAuthService = require("../services/chat-auth.service");

const router = express.Router();

router.post(
  "/request-otp",
  asyncHandler(async (req, res) => {
    const result = await chatAuthService.requestOtp(req.body);
    res.json(result);
  })
);

router.post(
  "/verify-otp",
  asyncHandler(async (req, res) => {
    const result = await chatAuthService.verifyOtp(req.body);
    res.json(result);
  })
);

router.get(
  "/me",
  requireChatAuth,
  asyncHandler(async (req, res) => {
    const user = await chatAuthService.getCurrentUser(req.chatUser.sub);
    res.json({ user });
  })
);

module.exports = router;
