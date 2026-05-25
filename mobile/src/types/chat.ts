export type ChatUser = {
  id: string;
  phone: string;
  name: string;
  avatar_url?: string | null;
  about?: string | null;
  last_seen_at?: string | null;
  is_online: boolean;
  role?: "user" | "admin";
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
  last_message_at?: string | null;
  updated_at?: string;
  created_at: string;
  participants?: ConversationParticipant[];
};

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  type: "text" | "image" | "video" | "document" | "audio" | "location";
  body?: string | null;
  is_forwarded: boolean;
  is_deleted: boolean;
  deleted_for_everyone: boolean;
  created_at: string;
};
