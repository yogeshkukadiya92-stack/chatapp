const express = require("express");
const { requireChatAuth } = require("../middleware/chat-auth.middleware");
const { asyncHandler } = require("../utils/async-handler");
const chatMediaService = require("../services/chat-media.service");

const router = express.Router();

router.post(
  "/upload",
  requireChatAuth,
  asyncHandler(async (req, res) => {
    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const media = await chatMediaService.createUpload(req.chatUser.sub, req.body, baseUrl);
    res.status(201).json({ media });
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const media = await chatMediaService.getMedia(req.params.id);
    res.setHeader("Content-Type", media.mime_type);
    res.setHeader("Content-Length", String(media.buffer.length));
    res.setHeader("Cache-Control", "private, max-age=3600");
    res.setHeader(
      "Content-Disposition",
      `${media.disposition}; filename="${encodeURIComponent(media.file_name)}"`
    );
    res.end(media.buffer);
  })
);

module.exports = router;
