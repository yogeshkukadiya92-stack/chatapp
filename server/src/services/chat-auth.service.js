const { z } = require("zod");
const crypto = require("crypto");
const { getSupabase, isSupabaseConfigured } = require("../config/supabase");
const { signChatToken } = require("../middleware/chat-auth.middleware");
const { createHttpError } = require("../utils/errors");
const { normalizePhone, parseWithSchema, phoneSchema } = require("../utils/validation");

const otpStore = new Map();
const defaultOtp = "123456";
const otpTtlMs = 5 * 60 * 1000;
const authModeSchema = z.enum(["signin", "signup"]);
const mockUsers = new Map();

seedMockUsers();

const requestOtpSchema = z.object({
  phone: phoneSchema,
  mode: authModeSchema.default("signin")
});

const verifyOtpSchema = z.object({
  phone: phoneSchema,
  otp: z.string().min(4).max(8),
  mode: authModeSchema.default("signin"),
  name: z.string().min(1).max(80).optional()
});

async function requestOtp(payload) {
  const { phone, mode } = parseWithSchema(requestOtpSchema, payload);
  const existingUser = await findChatUserByPhone(phone);

  if (mode === "signin" && !existingUser) {
    throw createHttpError(404, "No account found for this phone number. Please sign up first.");
  }

  if (mode === "signup" && existingUser) {
    throw createHttpError(409, "An account already exists for this phone number. Please sign in.");
  }

  const expiresAt = Date.now() + otpTtlMs;

  otpStore.set(phone, {
    otp: defaultOtp,
    expiresAt,
    mode
  });

  return {
    phone,
    mode,
    expires_in_seconds: Math.floor(otpTtlMs / 1000),
    development_otp: process.env.NODE_ENV === "production" ? undefined : defaultOtp
  };
}

async function verifyOtp(payload) {
  const { phone, otp, mode, name } = parseWithSchema(verifyOtpSchema, payload);
  const storedOtp = otpStore.get(phone);

  if (!storedOtp || storedOtp.expiresAt < Date.now()) {
    throw createHttpError(400, "OTP expired. Request a new code.");
  }

  if (storedOtp.mode !== mode) {
    throw createHttpError(400, "OTP was requested for a different auth flow. Request a new code.");
  }

  if (otp !== storedOtp.otp) {
    throw createHttpError(400, "Invalid OTP code");
  }

  otpStore.delete(phone);

  const user = await completeAuth(mode, phone, name);
  const token = signChatToken(user);

  return {
    token,
    user
  };
}

async function completeAuth(mode, rawPhone, name) {
  const phone = normalizePhone(rawPhone);
  const existingUser = await findChatUserByPhone(phone);

  if (mode === "signin") {
    if (!existingUser) {
      throw createHttpError(404, "No account found for this phone number. Please sign up first.");
    }

    return updateLoginPresence(existingUser.id);
  }

  if (!name?.trim()) {
    throw createHttpError(400, "Display name is required to sign up.");
  }

  if (existingUser) {
    throw createHttpError(409, "An account already exists for this phone number. Please sign in.");
  }

  return createChatUser(phone, name.trim());
}

async function findChatUserByPhone(rawPhone) {
  const phone = normalizePhone(rawPhone);

  if (!isSupabaseConfigured()) {
    return mockUsers.get(phone) || null;
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("chat_users")
    .select("*")
    .eq("phone", phone)
    .maybeSingle();

  if (error) {
    throw createHttpError(500, error.message, error);
  }

  return data;
}

async function updateLoginPresence(userId) {
  if (!isSupabaseConfigured()) {
    const user = Array.from(mockUsers.values()).find((entry) => entry.id === userId);

    if (!user) {
      throw createHttpError(404, "Chat user not found");
    }

    const updated = {
      ...user,
      is_online: true,
      last_seen_at: null,
      updated_at: new Date().toISOString()
    };
    mockUsers.set(user.phone, updated);
    return updated;
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("chat_users")
    .update({
      is_online: true,
      last_seen_at: null
    })
    .eq("id", userId)
    .select("*")
    .single();

  if (error) {
    throw createHttpError(500, error.message, error);
  }

  return data;
}

async function createChatUser(phone, name) {
  if (!isSupabaseConfigured()) {
    const now = new Date().toISOString();
    const created = {
      id: crypto.randomUUID(),
      phone,
      name,
      avatar_url: null,
      about: "Available",
      last_seen_at: null,
      is_online: true,
      role: "user",
      created_at: now,
      updated_at: now
    };
    mockUsers.set(phone, created);
    return created;
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("chat_users")
    .insert({
      phone,
      name,
      is_online: true
    })
    .select("*")
    .single();

  if (error) {
    throw createHttpError(500, error.message, error);
  }

  return data;
}

async function getCurrentUser(userId) {
  if (!isSupabaseConfigured()) {
    const user = Array.from(mockUsers.values()).find((entry) => entry.id === userId);

    if (!user) {
      throw createHttpError(404, "Chat user not found");
    }

    return user;
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("chat_users")
    .select("id, phone, name, avatar_url, about, last_seen_at, is_online, role, created_at, updated_at")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw createHttpError(500, error.message, error);
  }

  if (!data) {
    throw createHttpError(404, "Chat user not found");
  }

  return data;
}

function seedMockUsers() {
  const now = new Date().toISOString();
  const users = [
    { phone: "9825344428", name: "User 4428" },
    { phone: "7990979942", name: "User 9942" }
  ];

  for (const user of users) {
    const phone = normalizePhone(user.phone);
    mockUsers.set(phone, {
      id: crypto.randomUUID(),
      phone,
      name: user.name,
      avatar_url: null,
      about: "Available",
      last_seen_at: null,
      is_online: false,
      role: "user",
      created_at: now,
      updated_at: now
    });
  }
}

module.exports = {
  getDemoUsers,
  getDemoUserById,
  getDemoUserByPhone,
  getCurrentUser,
  requestOtp,
  verifyOtp
};

function getDemoUserByPhone(rawPhone) {
  const phone = normalizePhone(rawPhone);
  return mockUsers.get(phone) || null;
}

function getDemoUserById(userId) {
  return Array.from(mockUsers.values()).find((entry) => entry.id === userId) || null;
}

function getDemoUsers() {
  return Array.from(mockUsers.values());
}
