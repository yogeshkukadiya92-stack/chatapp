const express = require("express");
const { z } = require("zod");
const { asyncHandler } = require("../utils/async-handler");
const { parseWithSchema, uuidSchema } = require("../utils/validation");
const chatUserService = require("../services/chat-user.service");

const router = express.Router();

const userIdBodySchema = z.object({
  user_id: uuidSchema
});

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const users = await chatUserService.listUsers(req.chatUser.sub, {
      limit: req.query.limit
    });
    res.json({ users });
  })
);

router.get(
  "/search",
  asyncHandler(async (req, res) => {
    const user = await chatUserService.searchByPhone(req.chatUser.sub, req.query.phone);
    res.json({ user });
  })
);

router.patch(
  "/profile",
  asyncHandler(async (req, res) => {
    const user = await chatUserService.updateProfile(req.chatUser.sub, req.body);
    res.json({ user });
  })
);

router.post(
  "/block",
  asyncHandler(async (req, res) => {
    const { user_id: userId } = parseWithSchema(userIdBodySchema, req.body);
    const block = await chatUserService.blockUser(req.chatUser.sub, userId);
    res.status(201).json({ block });
  })
);

router.post(
  "/unblock",
  asyncHandler(async (req, res) => {
    const { user_id: userId } = parseWithSchema(userIdBodySchema, req.body);
    const result = await chatUserService.unblockUser(req.chatUser.sub, userId);
    res.json(result);
  })
);

module.exports = router;
