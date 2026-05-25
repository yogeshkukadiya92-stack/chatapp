const express = require("express");
const { asyncHandler } = require("../utils/async-handler");
const chatAdminService = require("../services/chat-admin.service");

const router = express.Router();

router.get(
  "/overview",
  asyncHandler(async (req, res) => {
    const overview = await chatAdminService.getOverview();
    res.json({ overview });
  })
);

router.get(
  "/users",
  asyncHandler(async (req, res) => {
    const users = await chatAdminService.listUsers();
    res.json({ users });
  })
);

router.get(
  "/conversations",
  asyncHandler(async (req, res) => {
    const conversations = await chatAdminService.listConversations();
    res.json({ conversations });
  })
);

router.get(
  "/messages",
  asyncHandler(async (req, res) => {
    const messages = await chatAdminService.listMessages();
    res.json({ messages });
  })
);

module.exports = router;
