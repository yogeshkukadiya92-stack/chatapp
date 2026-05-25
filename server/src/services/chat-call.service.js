const { z } = require("zod");
const { getSupabase } = require("../config/supabase");
const { createHttpError } = require("../utils/errors");
const { parseWithSchema, uuidSchema } = require("../utils/validation");
const { assertParticipant, getConversationParticipantIds } = require("./chat-conversation.service");

const startCallSchema = z.object({
  conversation_id: uuidSchema,
  receiver_id: uuidSchema.optional().nullable(),
  type: z.enum(["voice", "video"])
});

const endCallSchema = z.object({
  call_id: uuidSchema,
  status: z.enum(["accepted", "rejected", "ended", "missed"]).default("ended")
});

async function startCall(userId, payload) {
  const { conversation_id: conversationId, receiver_id: receiverId, type } = parseWithSchema(
    startCallSchema,
    payload
  );

  await assertParticipant(conversationId, userId);
  const participantIds = await getConversationParticipantIds(conversationId);

  if (receiverId && !participantIds.includes(receiverId)) {
    throw createHttpError(400, "Receiver is not in this conversation");
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("call_logs")
    .insert({
      conversation_id: conversationId,
      caller_id: userId,
      receiver_id: receiverId || null,
      type,
      status: "ringing"
    })
    .select("*")
    .single();

  if (error) {
    throw createHttpError(500, error.message, error);
  }

  return data;
}

async function endCall(userId, payload) {
  const { call_id: callId, status } = parseWithSchema(endCallSchema, payload);
  const supabase = getSupabase();
  const callResult = await supabase
    .from("call_logs")
    .select("*")
    .eq("id", callId)
    .maybeSingle();

  if (callResult.error) {
    throw createHttpError(500, callResult.error.message, callResult.error);
  }

  if (!callResult.data) {
    throw createHttpError(404, "Call not found");
  }

  const call = callResult.data;

  if (call.caller_id !== userId && call.receiver_id !== userId) {
    await assertParticipant(call.conversation_id, userId);
  }

  const endedAt = new Date();
  const startedAt = new Date(call.started_at);
  const durationSeconds = Math.max(0, Math.round((endedAt.getTime() - startedAt.getTime()) / 1000));
  const { data, error } = await supabase
    .from("call_logs")
    .update({
      status,
      ended_at: endedAt.toISOString(),
      duration_seconds: durationSeconds
    })
    .eq("id", callId)
    .select("*")
    .single();

  if (error) {
    throw createHttpError(500, error.message, error);
  }

  return data;
}

async function getCallHistory(userId) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("call_logs")
    .select("*")
    .or(`caller_id.eq.${userId},receiver_id.eq.${userId}`)
    .order("started_at", { ascending: false })
    .limit(100);

  if (error) {
    throw createHttpError(500, error.message, error);
  }

  return data;
}

module.exports = {
  endCall,
  getCallHistory,
  startCall
};
