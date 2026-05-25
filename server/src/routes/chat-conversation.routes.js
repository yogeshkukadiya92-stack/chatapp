const express = require("express");
const { z } = require("zod");
const { asyncHandler } = require("../utils/async-handler");
const { parseWithSchema, uuidSchema } = require("../utils/validation");
const chatConversationService = require("../services/chat-conversation.service");

const router = express.Router();

const participantBodySchema = z.object({
  user_id: uuidSchema
});

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const conversations = await chatConversationService.listConversations(req.chatUser.sub);
    res.json({ conversations });
  })
);

router.post(
  "/direct",
  asyncHandler(async (req, res) => {
    const conversation = await chatConversationService.createDirectConversation(
      req.chatUser.sub,
      req.body
    );
    res.status(201).json({ conversation });
  })
);

router.post(
  "/group",
  asyncHandler(async (req, res) => {
    const conversation = await chatConversationService.createGroupConversation(
      req.chatUser.sub,
      req.body
    );
    res.status(201).json({ conversation });
  })
);

router.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const conversation = await chatConversationService.updateConversation(
      req.chatUser.sub,
      req.params.id,
      req.body
    );
    res.json({ conversation });
  })
);

router.post(
  "/:id/participants",
  asyncHandler(async (req, res) => {
    const { user_id: userId } = parseWithSchema(participantBodySchema, req.body);
    const conversation = await chatConversationService.addParticipant(
      req.chatUser.sub,
      req.params.id,
      userId
    );
    res.status(201).json({ conversation });
  })
);

router.delete(
  "/:id/participants/:userId",
  asyncHandler(async (req, res) => {
    const result = await chatConversationService.removeParticipant(
      req.chatUser.sub,
      req.params.id,
      req.params.userId
    );
    res.json(result);
  })
);

module.exports = router;
