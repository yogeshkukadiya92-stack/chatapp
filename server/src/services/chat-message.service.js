const { z } = require("zod");
const crypto = require("crypto");
const { getSupabase } = require("../config/supabase");
const { isSupabaseConfigured } = require("../config/supabase");
const { createHttpError } = require("../utils/errors");
const { parseWithSchema, uuidSchema } = require("../utils/validation");
const {
  assertParticipant,
  getConversationParticipantIds
} = require("./chat-conversation.service");
const { isBlockedBetween } = require("./chat-user.service");

const messageSelect = `
  *,
  sender:chat_users(id, phone, name, avatar_url, about, is_online, last_seen_at),
  statuses:message_status(id, user_id, status, delivered_at, read_at, updated_at)
`;

const messageTypeSchema = z.enum(["text", "image", "video", "document", "audio", "location"]);

const createMessageSchema = z.object({
  type: messageTypeSchema.default("text"),
  body: z.string().max(5000).optional().nullable(),
  media_url: z.string().url().optional().nullable(),
  media_mime_type: z.string().max(160).optional().nullable(),
  media_size: z.number().int().nonnegative().optional().nullable(),
  reply_to_message_id: uuidSchema.optional().nullable(),
  is_forwarded: z.boolean().optional()
});

const updateMessageSchema = z.object({
  body: z.string().min(1).max(5000)
});

const deleteMessageSchema = z.object({
  deleted_for_everyone: z.boolean().optional()
});

const statusRank = {
  sent: 1,
  delivered: 2,
  read: 3
};
const demoMessages = new Map();

async function listMessages(userId, conversationId, options = {}) {
  if (!isSupabaseConfigured()) {
    await assertParticipant(conversationId, userId);
    return demoMessages.get(conversationId) || [];
  }

  await assertParticipant(conversationId, userId);

  const limit = Math.min(Number(options.limit || 50), 100);
  const supabase = getSupabase();
  let query = supabase
    .from("messages")
    .select(messageSelect)
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (options.before) {
    query = query.lt("created_at", options.before);
  }

  const { data, error } = await query;

  if (error) {
    throw createHttpError(500, error.message, error);
  }

  return data.reverse();
}

async function createMessage(userId, conversationId, payload) {
  if (!isSupabaseConfigured()) {
    await assertParticipant(conversationId, userId);
    const parsed = parseWithSchema(createMessageSchema, payload);
    validateMessagePayload(parsed);
    const now = new Date().toISOString();
    const message = {
      id: crypto.randomUUID(),
      conversation_id: conversationId,
      sender_id: userId,
      type: parsed.type,
      body: parsed.body || null,
      media_url: parsed.media_url || null,
      media_mime_type: parsed.media_mime_type || null,
      media_size: parsed.media_size || null,
      reply_to_message_id: parsed.reply_to_message_id || null,
      is_forwarded: Boolean(parsed.is_forwarded),
      is_deleted: false,
      deleted_for_everyone: false,
      created_at: now,
      updated_at: now,
      statuses: [
        {
          id: crypto.randomUUID(),
          message_id: "",
          user_id: userId,
          status: "sent",
          delivered_at: null,
          read_at: null,
          updated_at: now
        }
      ]
    };
    message.statuses = message.statuses.map((status) => ({
      ...status,
      message_id: message.id
    }));
    const rows = demoMessages.get(conversationId) || [];
    rows.push(message);
    demoMessages.set(conversationId, rows);
    return message;
  }

  await assertParticipant(conversationId, userId);
  const parsed = parseWithSchema(createMessageSchema, payload);

  validateMessagePayload(parsed);
  await assertNoBlockedParticipants(userId, conversationId);

  if (parsed.reply_to_message_id) {
    const replied = await getMessageRecord(parsed.reply_to_message_id);

    if (!replied || replied.conversation_id !== conversationId) {
      throw createHttpError(400, "Reply target is not in this conversation");
    }
  }

  const supabase = getSupabase();
  const insertPayload = {
    conversation_id: conversationId,
    sender_id: userId,
    type: parsed.type,
    body: parsed.body || null,
    media_url: parsed.media_url || null,
    media_mime_type: parsed.media_mime_type || null,
    media_size: parsed.media_size || null,
    reply_to_message_id: parsed.reply_to_message_id || null,
    is_forwarded: Boolean(parsed.is_forwarded)
  };

  const { data: message, error } = await supabase
    .from("messages")
    .insert(insertPayload)
    .select(messageSelect)
    .single();

  if (error) {
    throw createHttpError(500, error.message, error);
  }

  const participantIds = await getConversationParticipantIds(conversationId);
  const statusRows = participantIds.map((participantId) => ({
    message_id: message.id,
    user_id: participantId,
    status: participantId === userId ? "sent" : "sent"
  }));

  const statusResult = await supabase.from("message_status").insert(statusRows);

  if (statusResult.error) {
    throw createHttpError(500, statusResult.error.message, statusResult.error);
  }

  const updateResult = await supabase
    .from("conversations")
    .update({
      last_message_id: message.id,
      last_message_at: message.created_at
    })
    .eq("id", conversationId);

  if (updateResult.error) {
    throw createHttpError(500, updateResult.error.message, updateResult.error);
  }

  return getMessage(message.id);
}

async function updateMessage(userId, messageId, payload) {
  if (!isSupabaseConfigured()) {
    const { body } = parseWithSchema(updateMessageSchema, payload);
    for (const [conversationId, rows] of demoMessages.entries()) {
      const index = rows.findIndex((entry) => entry.id === messageId);

      if (index === -1) {
        continue;
      }

      const message = rows[index];
      await assertParticipant(conversationId, userId);

      if (message.sender_id !== userId) {
        throw createHttpError(403, "Only the sender can edit this message");
      }

      rows[index] = {
        ...message,
        body,
        updated_at: new Date().toISOString()
      };
      demoMessages.set(conversationId, rows);
      return rows[index];
    }

    throw createHttpError(404, "Message not found");
  }

  const { body } = parseWithSchema(updateMessageSchema, payload);
  const message = await getMessageRecord(messageId);

  if (!message) {
    throw createHttpError(404, "Message not found");
  }

  await assertParticipant(message.conversation_id, userId);

  if (message.sender_id !== userId) {
    throw createHttpError(403, "Only the sender can edit this message");
  }

  if (message.is_deleted) {
    throw createHttpError(400, "Deleted messages cannot be edited");
  }

  if (message.type !== "text") {
    throw createHttpError(400, "Only text messages can be edited in Phase 1");
  }

  const supabase = getSupabase();
  const { error } = await supabase.from("messages").update({ body }).eq("id", messageId);

  if (error) {
    throw createHttpError(500, error.message, error);
  }

  return getMessage(messageId);
}

async function deleteMessage(userId, messageId, payload = {}) {
  if (!isSupabaseConfigured()) {
    for (const [conversationId, rows] of demoMessages.entries()) {
      const index = rows.findIndex((entry) => entry.id === messageId);

      if (index === -1) {
        continue;
      }

      const message = rows[index];
      await assertParticipant(conversationId, userId);
      rows[index] = {
        ...message,
        body: null,
        is_deleted: true,
        deleted_for_everyone: true,
        updated_at: new Date().toISOString()
      };
      demoMessages.set(conversationId, rows);
      return rows[index];
    }

    throw createHttpError(404, "Message not found");
  }

  const { deleted_for_everyone: deletedForEveryone } = parseWithSchema(
    deleteMessageSchema,
    payload
  );
  const message = await getMessageRecord(messageId);

  if (!message) {
    throw createHttpError(404, "Message not found");
  }

  await assertParticipant(message.conversation_id, userId);

  if (message.sender_id !== userId && deletedForEveryone) {
    throw createHttpError(403, "Only the sender can delete for everyone");
  }

  const supabase = getSupabase();
  const { error } = await supabase
    .from("messages")
    .update({
      body: null,
      media_url: null,
      media_mime_type: null,
      media_size: null,
      is_deleted: true,
      deleted_for_everyone: Boolean(deletedForEveryone)
    })
    .eq("id", messageId);

  if (error) {
    throw createHttpError(500, error.message, error);
  }

  return getMessage(messageId);
}

async function markDelivered(userId, messageId) {
  if (!isSupabaseConfigured()) {
    return {
      id: crypto.randomUUID(),
      message_id: messageId,
      user_id: userId,
      status: "delivered"
    };
  }

  return upsertMessageStatus(userId, messageId, "delivered");
}

async function markRead(userId, messageId) {
  if (!isSupabaseConfigured()) {
    return {
      id: crypto.randomUUID(),
      message_id: messageId,
      user_id: userId,
      status: "read"
    };
  }

  const status = await upsertMessageStatus(userId, messageId, "read");
  const message = await getMessageRecord(messageId);
  const supabase = getSupabase();
  const { error } = await supabase
    .from("conversation_participants")
    .update({
      last_read_message_id: messageId
    })
    .eq("conversation_id", message.conversation_id)
    .eq("user_id", userId);

  if (error) {
    throw createHttpError(500, error.message, error);
  }

  return status;
}

async function upsertMessageStatus(userId, messageId, nextStatus) {
  const message = await getMessageRecord(messageId);

  if (!message) {
    throw createHttpError(404, "Message not found");
  }

  await assertParticipant(message.conversation_id, userId);

  const supabase = getSupabase();
  const existingResult = await supabase
    .from("message_status")
    .select("*")
    .eq("message_id", messageId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existingResult.error) {
    throw createHttpError(500, existingResult.error.message, existingResult.error);
  }

  const existing = existingResult.data;
  const status = existing && statusRank[existing.status] > statusRank[nextStatus]
    ? existing.status
    : nextStatus;
  const now = new Date().toISOString();
  const payload = {
    message_id: messageId,
    user_id: userId,
    status,
    delivered_at:
      statusRank[status] >= statusRank.delivered
        ? existing?.delivered_at || now
        : existing?.delivered_at || null,
    read_at: status === "read" ? existing?.read_at || now : existing?.read_at || null
  };

  const { data, error } = await supabase
    .from("message_status")
    .upsert(payload, {
      onConflict: "message_id,user_id"
    })
    .select("*")
    .single();

  if (error) {
    throw createHttpError(500, error.message, error);
  }

  return {
    ...data,
    conversation_id: message.conversation_id
  };
}

async function getMessage(messageId) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("messages")
    .select(messageSelect)
    .eq("id", messageId)
    .single();

  if (error) {
    throw createHttpError(500, error.message, error);
  }

  return data;
}

async function getMessageRecord(messageId) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("id", messageId)
    .maybeSingle();

  if (error) {
    throw createHttpError(500, error.message, error);
  }

  return data;
}

async function assertNoBlockedParticipants(userId, conversationId) {
  const participantIds = await getConversationParticipantIds(conversationId);

  for (const participantId of participantIds) {
    if (participantId !== userId && (await isBlockedBetween(userId, participantId))) {
      throw createHttpError(403, "You cannot message one or more participants");
    }
  }
}

function validateMessagePayload(message) {
  if (message.type === "text" && !message.body?.trim()) {
    throw createHttpError(400, "Text messages require body");
  }

  if (["image", "video", "document", "audio"].includes(message.type) && !message.media_url) {
    throw createHttpError(400, "Media messages require media_url");
  }

  if (message.type === "location" && !message.body?.trim()) {
    throw createHttpError(400, "Location messages should include a body with coordinates JSON");
  }
}

module.exports = {
  createMessage,
  deleteMessage,
  getMessage,
  listMessages,
  markDelivered,
  markRead,
  updateMessage
};
