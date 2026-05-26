const crypto = require("crypto");
const { z } = require("zod");
const { createHttpError } = require("../utils/errors");
const { parseWithSchema } = require("../utils/validation");

const maxUploadBytes = 20 * 1024 * 1024;
const mediaStore = new Map();

const uploadSchema = z.object({
  file_name: z.string().min(1).max(240),
  mime_type: z.string().min(3).max(160),
  size: z.number().int().nonnegative().max(maxUploadBytes),
  type: z.enum(["image", "video", "document", "audio"]),
  data_base64: z.string().min(1)
});

async function createUpload(userId, payload, baseUrl) {
  const media = parseWithSchema(uploadSchema, payload);
  const buffer = Buffer.from(media.data_base64, "base64");

  if (!buffer.length || buffer.length > maxUploadBytes) {
    throw createHttpError(400, "Attachment must be smaller than 20MB.");
  }

  if (Math.abs(buffer.length - media.size) > 8) {
    throw createHttpError(400, "Attachment payload size does not match file size.");
  }

  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const record = {
    id,
    owner_id: userId,
    file_name: media.file_name,
    mime_type: media.mime_type,
    size: buffer.length,
    type: media.type,
    buffer,
    created_at: createdAt
  };

  mediaStore.set(id, record);

  // Phase 1 stores media in process memory for demo deployments. Replace this with
  // Supabase Storage signed uploads before production, so media survives restarts.
  return {
    id,
    owner_id: userId,
    file_name: media.file_name,
    mime_type: media.mime_type,
    size: buffer.length,
    type: media.type,
    public_url: `${baseUrl}/api/chat/media/${id}`,
    storage_provider: "memory-demo",
    status: "uploaded",
    created_at: createdAt
  };
}

async function getMedia(mediaId) {
  const media = mediaStore.get(mediaId);

  if (!media) {
    throw createHttpError(404, "Media object not found or expired after server restart.");
  }

  return {
    ...media,
    disposition: media.type === "document" ? "attachment" : "inline"
  };
}

module.exports = {
  createUpload,
  getMedia
};
