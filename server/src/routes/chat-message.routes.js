const express = require("express");
const { asyncHandler } = require("../utils/async-handler");
const chatMessageService = require("../services/chat-message.service");

const router = express.Router();

router.get(
  "/conversations/:conversationId/messages",
  asyncHandler(async (req, res) => {
    const messages = await chatMessageService.listMessages(req.chatUser.sub, req.params.conversationId, {
      before: req.query.before,
      limit: req.query.limit
    });
    res.json({ messages });
  })
);

router.post(
  "/conversations/:conversationId/messages",
  asyncHandler(async (req, res) => {
    const message = await chatMessageService.createMessage(
      req.chatUser.sub,
      req.params.conversationId,
      req.body
    );
    res.status(201).json({ message });
  })
);

router.patch(
  "/messages/:id",
  asyncHandler(async (req, res) => {
    const message = await chatMessageService.updateMessage(req.chatUser.sub, req.params.id, req.body);
    res.json({ message });
  })
);

router.delete(
  "/messages/:id",
  asyncHandler(async (req, res) => {
    const message = await chatMessageService.deleteMessage(req.chatUser.sub, req.params.id, req.body);
    res.json({ message });
  })
);

router.post(
  "/messages/:id/read",
  asyncHandler(async (req, res) => {
    const status = await chatMessageService.markRead(req.chatUser.sub, req.params.id);
    res.json({ status });
  })
);

router.post(
  "/messages/:id/delivered",
  asyncHandler(async (req, res) => {
    const status = await chatMessageService.markDelivered(req.chatUser.sub, req.params.id);
    res.json({ status });
  })
);

module.exports = router;
