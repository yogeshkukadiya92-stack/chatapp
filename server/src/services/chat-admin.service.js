const { getSupabase } = require("../config/supabase");
const { createHttpError } = require("../utils/errors");

async function getOverview() {
  const supabase = getSupabase();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [users, conversations, messages, activeUsers, callLogs] = await Promise.all([
    countRows("chat_users"),
    countRows("conversations"),
    countRows("messages"),
    countRows("chat_users", (query) => query.gte("last_seen_at", today.toISOString())),
    supabase.from("call_logs").select("*").order("started_at", { ascending: false }).limit(10)
  ]);

  if (callLogs.error) {
    throw createHttpError(500, callLogs.error.message, callLogs.error);
  }

  return {
    total_users: users,
    total_conversations: conversations,
    total_messages: messages,
    active_users_today: activeUsers,
    recent_call_logs: callLogs.data,
    reported_users: []
  };
}

async function listUsers() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("chat_users")
    .select("id, phone, name, avatar_url, about, is_online, last_seen_at, role, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    throw createHttpError(500, error.message, error);
  }

  return data;
}

async function listConversations() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("conversations")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(200);

  if (error) {
    throw createHttpError(500, error.message, error);
  }

  return data;
}

async function listMessages() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    throw createHttpError(500, error.message, error);
  }

  return data;
}

async function countRows(table, decorate = (query) => query) {
  const supabase = getSupabase();
  const query = decorate(supabase.from(table).select("id", { count: "exact", head: true }));
  const { count, error } = await query;

  if (error) {
    throw createHttpError(500, error.message, error);
  }

  return count || 0;
}

module.exports = {
  getOverview,
  listConversations,
  listMessages,
  listUsers
};
