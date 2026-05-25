const express = require("express");
const { asyncHandler } = require("../utils/async-handler");
const chatMediaService = require("../services/chat-media.service");

const router = express.Router();

router.post(
  "/upload",
  asyncHandler(async (req, res) => {
    const media = await chatMediaService.createUploadPlaceholder(req.chatUser.sub, req.body);
    res.status(202).json({ media });
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const media = await chatMediaService.getMediaPlaceholder(req.params.id);
    res.json({ media });
  })
);

module.exports = router;
