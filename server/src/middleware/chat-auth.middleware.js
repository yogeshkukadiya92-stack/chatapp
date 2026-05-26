const jwt = require("jsonwebtoken");
const { loadDemoStore } = require("../services/demo-store");
const { createHttpError } = require("../utils/errors");

function getJwtSecret() {
  if (process.env.JWT_SECRET) {
    return process.env.JWT_SECRET;
  }

  if (process.env.NODE_ENV !== "production") {
    return "local-dev-chat-secret";
  }

  throw createHttpError(500, "JWT_SECRET is not configured");
}

function signChatToken(user) {
  const secret = getJwtSecret();

  return jwt.sign(
    {
      sub: user.id,
      phone: user.phone,
      role: user.role || "user"
    },
    secret,
    {
      expiresIn: "30d"
    }
  );
}

function verifyChatToken(token) {
  const secret = getJwtSecret();

  try {
    return jwt.verify(token, secret);
  } catch (error) {
    throw createHttpError(401, "Invalid or expired chat session");
  }
}

function requireChatAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return next(createHttpError(401, "Missing authorization token"));
  }

  try {
    req.chatUser = normalizeDemoTokenPayload(verifyChatToken(token));
    next();
  } catch (error) {
    next(error);
  }
}

function normalizeDemoTokenPayload(payload) {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return payload;
  }

  if (!payload.phone) {
    return payload;
  }

  const user = loadDemoStore().users.find((entry) => entry.phone === payload.phone);

  return user
    ? {
        ...payload,
        sub: user.id,
        role: user.role || payload.role || "user"
      }
    : payload;
}

function requireChatAdmin(req, res, next) {
  if (req.chatUser?.role !== "admin") {
    return next(createHttpError(403, "Admin access required"));
  }

  next();
}

module.exports = {
  requireChatAdmin,
  requireChatAuth,
  signChatToken,
  verifyChatToken
};
