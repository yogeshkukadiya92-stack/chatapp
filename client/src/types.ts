export type ChatUser = {
  id: string;
  phone: string;
  name: string;
  avatar_url?: string | null;
  about?: string | null;
  last_seen_at?: string | null;
  is_online: boolean;
  role?: "user" | "admin";
  created_at?: string;
  updated_at?: string;
};

export type ConversationParticipant = {
  id: string;
  conversation_id: string;
  user_id: string;
  role: "owner" | "admin" | "member";
  joined_at: string;
  user: ChatUser;
};

export type Conversation = {
  id: string;
  type: "direct" | "group";
  title?: string | null;
  avatar_url?: string | null;
  created_by?: string | null;
  last_message_id?: string | null;
  last_message_at?: string | null;
  updated_at?: string;
  created_at: string;
  participants?: ConversationParticipant[];
};

export type MessageStatus = {
  id: string;
  message_id: string;
  user_id: string;
  status: "sent" | "delivered" | "read";
  delivered_at?: string | null;
  read_at?: string | null;
  conversation_id?: string;
};

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  type: "text" | "image" | "video" | "document" | "audio" | "location";
  body?: string | null;
  media_url?: string | null;
  media_mime_type?: string | null;
  media_size?: number | null;
  reply_to_message_id?: string | null;
  is_forwarded: boolean;
  is_deleted: boolean;
  deleted_for_everyone: boolean;
  created_at: string;
  updated_at?: string;
  sender?: ChatUser;
  statuses?: MessageStatus[];
};

export type CallState = {
  callId?: string;
  conversationId: string;
  targetUserId?: string;
  fromUserId?: string;
  type: "voice" | "video";
  status: "ringing" | "accepted" | "rejected" | "ended";
  direction: "incoming" | "outgoing";
};

export type AdminOverview = {
  total_users: number;
  total_conversations: number;
  total_messages: number;
  active_users_today: number;
  recent_call_logs: Array<Record<string, unknown>>;
  reported_users: Array<Record<string, unknown>>;
};
