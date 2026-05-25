const express = require("express");
const { asyncHandler } = require("../utils/async-handler");
const chatCallService = require("../services/chat-call.service");

const router = express.Router();

router.post(
  "/start",
  asyncHandler(async (req, res) => {
    const call = await chatCallService.startCall(req.chatUser.sub, req.body);
    res.status(201).json({ call });
  })
);

router.post(
  "/end",
  asyncHandler(async (req, res) => {
    const call = await chatCallService.endCall(req.chatUser.sub, req.body);
    res.json({ call });
  })
);

router.get(
  "/history",
  asyncHandler(async (req, res) => {
    const calls = await chatCallService.getCallHistory(req.chatUser.sub);
    res.json({ calls });
  })
);

module.exports = router;
