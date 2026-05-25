const { z } = require("zod");
const { getSupabase, isSupabaseConfigured } = require("../config/supabase");
const {
  getDemoUserById,
  getDemoUserByPhone,
  getDemoUsers
} = require("./chat-auth.service");
const { assertSupabase, createHttpError } = require("../utils/errors");
const { normalizePhone, parseWithSchema, phoneSchema } = require("../utils/validation");

const publicUserFields =
  "id, phone, name, avatar_url, about, last_seen_at, is_online, role, created_at, updated_at";

const updateProfileSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  avatar_url: z.string().url().nullable().optional(),
  about: z.string().max(160).optional()
});

async function getUserById(userId) {
  if (!isSupabaseConfigured()) {
    const user = getDemoUserById(userId);

    if (!user) {
      throw createHttpError(404, "Chat user not found");
    }

    return user;
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("chat_users")
    .select(publicUserFields)
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

async function getUserByPhone(phone) {
  if (!isSupabaseConfigured()) {
    return getDemoUserByPhone(phone);
  }

  const supabase = getSupabase();
  const normalizedPhone = normalizePhone(phone);
  const { data, error } = await supabase
    .from("chat_users")
    .select(publicUserFields)
    .eq("phone", normalizedPhone)
    .maybeSingle();

  if (error) {
    throw createHttpError(500, error.message, error);
  }

  return data;
}

async function searchByPhone(requesterId, rawPhone) {
  const phone = parseWithSchema(phoneSchema, rawPhone);
  const user = await getUserByPhone(phone);

  if (!user) {
    return null;
  }

  const blocked = await isBlockedBetween(requesterId, user.id);

  if (blocked) {
    throw createHttpError(403, "This user is not available");
  }

  return user;
}

async function createOrUpdatePresence(userId, isOnline) {
  if (!isSupabaseConfigured()) {
    const user = await getUserById(userId);
    return {
      ...user,
      is_online: isOnline,
      last_seen_at: isOnline ? null : new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("chat_users")
    .update({
      is_online: isOnline,
      last_seen_at: isOnline ? null : new Date().toISOString()
    })
    .eq("id", userId)
    .select(publicUserFields)
    .single();

  if (error) {
    throw createHttpError(500, error.message, error);
  }

  return data;
}

async function updateProfile(userId, payload) {
  if (!isSupabaseConfigured()) {
    const user = await getUserById(userId);
    const updates = parseWithSchema(updateProfileSchema, payload);
    return {
      ...user,
      ...updates,
      updated_at: new Date().toISOString()
    };
  }

  const updates = parseWithSchema(updateProfileSchema, payload);

  if (!Object.keys(updates).length) {
    return getUserById(userId);
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("chat_users")
    .update(updates)
    .eq("id", userId)
    .select(publicUserFields)
    .single();

  if (error) {
    throw createHttpError(500, error.message, error);
  }

  return data;
}

async function blockUser(blockerId, blockedId) {
  if (!isSupabaseConfigured()) {
    throw createHttpError(400, "Block feature requires Supabase in this phase");
  }

  if (blockerId === blockedId) {
    throw createHttpError(400, "You cannot block yourself");
  }

  await getUserById(blockedId);

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("blocked_users")
    .upsert(
      {
        blocker_id: blockerId,
        blocked_id: blockedId
      },
      {
        onConflict: "blocker_id,blocked_id"
      }
    )
    .select("*")
    .single();

  if (error) {
    throw createHttpError(500, error.message, error);
  }

  return data;
}

async function unblockUser(blockerId, blockedId) {
  if (!isSupabaseConfigured()) {
    return {
      blocked_id: blockedId,
      unblocked: true
    };
  }

  const supabase = getSupabase();
  const { error } = await supabase
    .from("blocked_users")
    .delete()
    .eq("blocker_id", blockerId)
    .eq("blocked_id", blockedId);

  if (error) {
    throw createHttpError(500, error.message, error);
  }

  return {
    blocked_id: blockedId,
    unblocked: true
  };
}

async function isBlockedBetween(userAId, userBId) {
  if (!isSupabaseConfigured()) {
    return false;
  }

  if (!userAId || !userBId || userAId === userBId) {
    return false;
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("blocked_users")
    .select("id")
    .or(
      `and(blocker_id.eq.${userAId},blocked_id.eq.${userBId}),and(blocker_id.eq.${userBId},blocked_id.eq.${userAId})`
    )
    .limit(1);

  if (error) {
    throw createHttpError(500, error.message, error);
  }

  return data.length > 0;
}

async function listUsers(requesterId, options = {}) {
  if (!isSupabaseConfigured()) {
    const limit = Math.min(Number(options.limit || 100), 200);
    return getDemoUsers()
      .filter((user) => user.id !== requesterId)
      .slice(0, limit);
  }

  const limit = Math.min(Number(options.limit || 100), 200);
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("chat_users")
    .select(publicUserFields)
    .neq("id", requesterId)
    .order("name", { ascending: true })
    .limit(limit);

  if (error) {
    throw createHttpError(500, error.message, error);
  }

  return data;
}

module.exports = {
  blockUser,
  createOrUpdatePresence,
  getUserById,
  getUserByPhone,
  isBlockedBetween,
  listUsers,
  searchByPhone,
  unblockUser,
  updateProfile
};
