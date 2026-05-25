const { z } = require("zod");
const { createHttpError } = require("./errors");

const uuidSchema = z.string().uuid();
const phoneSchema = z
  .string()
  .min(7)
  .max(20)
  .transform((value) => normalizePhone(value));

function normalizePhone(phone) {
  return String(phone || "")
    .trim()
    .replace(/[\s()-]/g, "");
}

function parseWithSchema(schema, value) {
  const result = schema.safeParse(value);

  if (!result.success) {
    throw createHttpError(400, "Invalid request payload", result.error.flatten());
  }

  return result.data;
}

module.exports = {
  normalizePhone,
  parseWithSchema,
  phoneSchema,
  uuidSchema
};
