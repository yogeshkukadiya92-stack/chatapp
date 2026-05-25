const { z } = require("zod");
const crypto = require("crypto");
const { getSupabase, isSupabaseConfigured } = require("../config/supabase");
const { createHttpError } = require("../utils/errors");
const { parseWithSchema, phoneSchema, uuidSchema } = require("../utils/validation");
const { getUserByPhone, isBlockedBetween } = require("./chat-user.service");
const { getDemoUserById } = require("./chat-auth.service");

const demoConversations = new Map();

const participantSelect = `
  id,
  conversation_id,
  user_id,
  role,
  joined_at,
  user:chat_users(id, phone, name, avatar_url, about, is_online, last_seen_at)
`;

const conversationSelect = `
  *,
  participants:conversation_participants(${participantSelect})
`;

const directConversationSchema = z.object({
  phone: phoneSchema.optional(),
  user_id: uuidSchema.optional()
});

const groupConversationSchema = z.object({
  title: z.string().min(1).max(120),
  participant_ids: z.array(uuidSchema).min(1).max(100),
  avatar_url: z.string().url().nullable().optional()
});

const updateConversationSchema = z.object({
  title: z.string().min(1).max(120).optional(),
  avatar_url: z.string().url().nullable().optional()
});

async function assertParticipant(conversationId, userId) {
  if (!isSupabaseConfigured()) {
    const conversation = demoConversations.get(conversationId);
    const participant = conversation?.participants?.find((entry) => entry.user_id === userId);

    if (!participant) {
      throw createHttpError(403, "You are not a participant in this conversation");
    }

    return participant;
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("conversation_participants")
    .select("*")
    .eq("conversation_id", conversationId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw createHttpError(500, error.message, error);
  }

  if (!data) {
    throw createHttpError(403, "You are not a participant in this conversation");
  }

  return data;
}

async function getConversationById(conversationId, userId) {
  if (!isSupabaseConfigured()) {
    const conversation = demoConversations.get(conversationId);

    if (!conversation) {
      throw createHttpError(404, "Conversation not found");
    }

    await assertParticipant(conversationId, userId);
    return conversation;
  }

  await assertParticipant(conversationId, userId);

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("conversations")
    .select(conversationSelect)
    .eq("id", conversationId)
    .single();

  if (error) {
    throw createHttpError(500, error.message, error);
  }

  return data;
}

async function listConversations(userId) {
  if (!isSupabaseConfigured()) {
    return Array.from(demoConversations.values())
      .filter((conversation) => conversation.participants.some((entry) => entry.user_id === userId))
      .sort((a, b) => {
        const aTime = new Date(a.last_message_at || a.updated_at || a.created_at).getTime();
        const bTime = new Date(b.last_message_at || b.updated_at || b.created_at).getTime();
        return bTime - aTime;
      });
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("conversation_participants")
    .select(
      `
      conversation_id,
      role,
      joined_at,
      conversation:conversations(${conversationSelect})
    `
    )
    .eq("user_id", userId);

  if (error) {
    throw createHttpError(500, error.message, error);
  }

  return data
    .map((row) => ({
      ...row.conversation,
      current_user_role: row.role,
      current_user_joined_at: row.joined_at
    }))
    .sort((a, b) => {
      const aTime = new Date(a.last_message_at || a.updated_at || a.created_at).getTime();
      const bTime = new Date(b.last_message_at || b.updated_at || b.created_at).getTime();
      return bTime - aTime;
    });
}

async function createDirectConversation(userId, payload) {
  const { phone, user_id: peerUserId } = parseWithSchema(directConversationSchema, payload);

  if (!phone && !peerUserId) {
    throw createHttpError(400, "Provide phone or user_id");
  }

  const peer = phone ? await getUserByPhone(phone) : await getUserRecord(peerUserId);

  if (!peer) {
    throw createHttpError(404, "Chat user not found");
  }

  if (peer.id === userId) {
    throw createHttpError(400, "You cannot create a direct chat with yourself");
  }

  if (await isBlockedBetween(userId, peer.id)) {
    throw createHttpError(403, "You cannot message this user");
  }

  const existing = await findExistingDirectConversation(userId, peer.id);

  if (existing) {
    return existing;
  }

  if (!isSupabaseConfigured()) {
    const now = new Date().toISOString();
    const conversation = {
      id: crypto.randomUUID(),
      type: "direct",
      title: null,
      avatar_url: null,
      created_by: userId,
      last_message_id: null,
      last_message_at: null,
      created_at: now,
      updated_at: now,
      participants: [
        {
          id: crypto.randomUUID(),
          conversation_id: "",
          user_id: userId,
          role: "owner",
          joined_at: now,
          user: getDemoUserById(userId) || { id: userId, name: "You", phone: "" }
        },
        {
          id: crypto.randomUUID(),
          conversation_id: "",
          user_id: peer.id,
          role: "member",
          joined_at: now,
          user: peer
        }
      ]
    };
    conversation.participants = conversation.participants.map((entry) => ({
      ...entry,
      conversation_id: conversation.id
    }));
    demoConversations.set(conversation.id, conversation);
    return conversation;
  }

  const supabase = getSupabase();
  const conversationResult = await supabase
    .from("conversations")
    .insert({
      type: "direct",
      created_by: userId
    })
    .select("*")
    .single();

  if (conversationResult.error) {
    throw createHttpError(500, conversationResult.error.message, conversationResult.error);
  }

  const conversation = conversationResult.data;
  const participantResult = await supabase.from("conversation_participants").insert([
    {
      conversation_id: conversation.id,
      user_id: userId,
      role: "owner"
    },
    {
      conversation_id: conversation.id,
      user_id: peer.id,
      role: "member"
    }
  ]);

  if (participantResult.error) {
    throw createHttpError(500, participantResult.error.message, participantResult.error);
  }

  return getConversationById(conversation.id, userId);
}

async function createGroupConversation(userId, payload) {
  if (!isSupabaseConfigured()) {
    const { title, participant_ids: participantIds } = parseWithSchema(groupConversationSchema, payload);
    const now = new Date().toISOString();
    const uniqueParticipantIds = Array.from(new Set([userId, ...participantIds]));
    const participants = uniqueParticipantIds.map((participantId, index) => {
      const user = getDemoUserById(participantId);

      if (!user) {
        throw createHttpError(400, "One or more participants do not exist");
      }

      return {
        id: crypto.randomUUID(),
        conversation_id: "",
        user_id: participantId,
        role: index === 0 ? "owner" : "member",
        joined_at: now,
        user
      };
    });
    const conversation = {
      id: crypto.randomUUID(),
      type: "group",
      title,
      avatar_url: null,
      created_by: userId,
      last_message_id: null,
      last_message_at: null,
      created_at: now,
      updated_at: now,
      participants: participants.map((participant) => ({
        ...participant,
        conversation_id: ""
      }))
    };
    conversation.participants = conversation.participants.map((participant) => ({
      ...participant,
      conversation_id: conversation.id
    }));
    demoConversations.set(conversation.id, conversation);
    return conversation;
  }

  const { title, participant_ids: participantIds, avatar_url: avatarUrl } = parseWithSchema(
    groupConversationSchema,
    payload
  );
  const uniqueParticipantIds = Array.from(new Set([userId, ...participantIds]));

  const supabase = getSupabase();
  const { data: users, error: usersError } = await supabase
    .from("chat_users")
    .select("id")
    .in("id", uniqueParticipantIds);

  if (usersError) {
    throw createHttpError(500, usersError.message, usersError);
  }

  if (users.length !== uniqueParticipantIds.length) {
    throw createHttpError(400, "One or more participants do not exist");
  }

  for (const participantId of uniqueParticipantIds) {
    if (participantId !== userId && (await isBlockedBetween(userId, participantId))) {
      throw createHttpError(403, "One or more participants cannot be added");
    }
  }

  const conversationResult = await supabase
    .from("conversations")
    .insert({
      type: "group",
      title,
      avatar_url: avatarUrl || null,
      created_by: userId
    })
    .select("*")
    .single();

  if (conversationResult.error) {
    throw createHttpError(500, conversationResult.error.message, conversationResult.error);
  }

  const conversation = conversationResult.data;
  const participantRows = uniqueParticipantIds.map((participantId) => ({
    conversation_id: conversation.id,
    user_id: participantId,
    role: participantId === userId ? "owner" : "member"
  }));

  const participantResult = await supabase.from("conversation_participants").insert(participantRows);

  if (participantResult.error) {
    throw createHttpError(500, participantResult.error.message, participantResult.error);
  }

  return getConversationById(conversation.id, userId);
}

async function updateConversation(userId, conversationId, payload) {
  if (!isSupabaseConfigured()) {
    throw createHttpError(400, "Conversation updates require Supabase in this phase");
  }

  await assertParticipant(conversationId, userId);
  const updates = parseWithSchema(updateConversationSchema, payload);

  if (!Object.keys(updates).length) {
    return getConversationById(conversationId, userId);
  }

  const supabase = getSupabase();
  const { error } = await supabase.from("conversations").update(updates).eq("id", conversationId);

  if (error) {
    throw createHttpError(500, error.message, error);
  }

  return getConversationById(conversationId, userId);
}

async function addParticipant(userId, conversationId, participantId) {
  if (!isSupabaseConfigured()) {
    throw createHttpError(400, "Participant changes require Supabase in this phase");
  }

  await assertParticipant(conversationId, userId);
  const conversation = await getConversationById(conversationId, userId);

  if (conversation.type !== "group") {
    throw createHttpError(400, "Participants can only be added to group conversations");
  }

  if (await isBlockedBetween(userId, participantId)) {
    throw createHttpError(403, "This participant cannot be added");
  }

  const supabase = getSupabase();
  const { error } = await supabase.from("conversation_participants").upsert(
    {
      conversation_id: conversationId,
      user_id: participantId,
      role: "member"
    },
    {
      onConflict: "conversation_id,user_id"
    }
  );

  if (error) {
    throw createHttpError(500, error.message, error);
  }

  return getConversationById(conversationId, userId);
}

async function removeParticipant(userId, conversationId, participantId) {
  if (!isSupabaseConfigured()) {
    throw createHttpError(400, "Participant changes require Supabase in this phase");
  }

  const requester = await assertParticipant(conversationId, userId);
  const conversation = await getConversationById(conversationId, userId);

  if (conversation.type !== "group") {
    throw createHttpError(400, "Participants can only be removed from group conversations");
  }

  if (participantId !== userId && !["owner", "admin"].includes(requester.role)) {
    throw createHttpError(403, "Only group owners or admins can remove other participants");
  }

  const supabase = getSupabase();
  const { error } = await supabase
    .from("conversation_participants")
    .delete()
    .eq("conversation_id", conversationId)
    .eq("user_id", participantId);

  if (error) {
    throw createHttpError(500, error.message, error);
  }

  return {
    removed: true,
    conversation_id: conversationId,
    user_id: participantId
  };
}

async function getConversationParticipantIds(conversationId) {
  if (!isSupabaseConfigured()) {
    const conversation = demoConversations.get(conversationId);
    return conversation ? conversation.participants.map((entry) => entry.user_id) : [];
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("conversation_participants")
    .select("user_id")
    .eq("conversation_id", conversationId);

  if (error) {
    throw createHttpError(500, error.message, error);
  }

  return data.map((participant) => participant.user_id);
}

async function findExistingDirectConversation(userId, peerId) {
  if (!isSupabaseConfigured()) {
    return (
      Array.from(demoConversations.values()).find(
        (conversation) =>
          conversation.type === "direct" &&
          conversation.participants.some((entry) => entry.user_id === userId) &&
          conversation.participants.some((entry) => entry.user_id === peerId)
      ) || null
    );
  }

  const supabase = getSupabase();
  const userRows = await supabase
    .from("conversation_participants")
    .select("conversation_id, conversation:conversations(type)")
    .eq("user_id", userId);

  if (userRows.error) {
    throw createHttpError(500, userRows.error.message, userRows.error);
  }

  const directIds = userRows.data
    .filter((row) => row.conversation?.type === "direct")
    .map((row) => row.conversation_id);

  if (!directIds.length) {
    return null;
  }

  const peerRows = await supabase
    .from("conversation_participants")
    .select("conversation_id")
    .eq("user_id", peerId)
    .in("conversation_id", directIds);

  if (peerRows.error) {
    throw createHttpError(500, peerRows.error.message, peerRows.error);
  }

  if (!peerRows.data.length) {
    return null;
  }

  return getConversationById(peerRows.data[0].conversation_id, userId);
}

async function getUserRecord(userId) {
  if (!isSupabaseConfigured()) {
    return getDemoUserById(userId);
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("chat_users")
    .select("id, phone, name, avatar_url, about, is_online, last_seen_at")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw createHttpError(500, error.message, error);
  }

  return data;
}

module.exports = {
  addParticipant,
  assertParticipant,
  createDirectConversation,
  createGroupConversation,
  getConversationById,
  getConversationParticipantIds,
  listConversations,
  removeParticipant,
  updateConversation
};
