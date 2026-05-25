const { z } = require("zod");
const { createHttpError } = require("../utils/errors");
const { parseWithSchema } = require("../utils/validation");

const uploadSchema = z.object({
  file_name: z.string().min(1).max(240),
  mime_type: z.string().min(3).max(160),
  size: z.number().int().nonnegative(),
  type: z.enum(["image", "video", "document", "audio"])
});

async function createUploadPlaceholder(userId, payload) {
  const media = parseWithSchema(uploadSchema, payload);

  // Phase 1 placeholder: wire this to Supabase Storage signed uploads later.
  return {
    id: `placeholder-${Date.now()}`,
    owner_id: userId,
    ...media,
    upload_url: null,
    public_url: null,
    storage_provider: "supabase-storage",
    status: "not_configured"
  };
}

async function getMediaPlaceholder(mediaId) {
  if (!mediaId?.startsWith("placeholder-")) {
    throw createHttpError(404, "Media object not found");
  }

  return {
    id: mediaId,
    status: "not_configured",
    message: "Configure Supabase Storage and signed URLs for production media access."
  };
}

module.exports = {
  createUploadPlaceholder,
  getMediaPlaceholder
};
