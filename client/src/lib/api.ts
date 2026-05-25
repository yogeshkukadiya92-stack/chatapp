import type { AdminOverview, ChatUser, Conversation, Message, MessageStatus } from "../types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";
const TOKEN_KEY = "chat_platform_token";

export type AuthMode = "signin" | "signup";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "Request failed");
  }

  return data as T;
}

export const api = {
  requestOtp(phone: string, mode: AuthMode) {
    return request<{ phone: string; mode: AuthMode; development_otp?: string }>("/chat-auth/request-otp", {
      method: "POST",
      body: JSON.stringify({ phone, mode })
    });
  },
  verifyOtp(phone: string, otp: string, mode: AuthMode, name?: string) {
    return request<{ token: string; user: ChatUser }>("/chat-auth/verify-otp", {
      method: "POST",
      body: JSON.stringify({ phone, otp, mode, name })
    });
  },
  me() {
    return request<{ user: ChatUser }>("/chat-auth/me");
  },
  listUsers(limit = 200) {
    return request<{ users: ChatUser[] }>(`/chat/users?limit=${limit}`);
  },
  searchUser(phone: string) {
    return request<{ user: ChatUser | null }>(`/chat/users/search?phone=${encodeURIComponent(phone)}`);
  },
  updateProfile(payload: Partial<Pick<ChatUser, "name" | "avatar_url" | "about">>) {
    return request<{ user: ChatUser }>("/chat/users/profile", {
      method: "PATCH",
      body: JSON.stringify(payload)
    });
  },
  listConversations() {
    return request<{ conversations: Conversation[] }>("/chat/conversations");
  },
  createDirectConversation(phone: string) {
    return request<{ conversation: Conversation }>("/chat/conversations/direct", {
      method: "POST",
      body: JSON.stringify({ phone })
    });
  },
  createGroupConversation(title: string, participantIds: string[]) {
    return request<{ conversation: Conversation }>("/chat/conversations/group", {
      method: "POST",
      body: JSON.stringify({
        title,
        participant_ids: participantIds
      })
    });
  },
  listMessages(conversationId: string) {
    return request<{ messages: Message[] }>(`/chat/conversations/${conversationId}/messages`);
  },
  sendMessage(
    conversationId: string,
    payload:
      | string
      | {
          type?: Message["type"];
          body?: string | null;
          media_url?: string | null;
          media_mime_type?: string | null;
          media_size?: number | null;
          reply_to_message_id?: string | null;
          is_forwarded?: boolean;
        }
  ) {
    const bodyPayload =
      typeof payload === "string"
        ? { type: "text", body: payload }
        : { type: "text", ...payload };

    return request<{ message: Message }>(`/chat/conversations/${conversationId}/messages`, {
      method: "POST",
      body: JSON.stringify(bodyPayload)
    });
  },
  updateMessage(messageId: string, body: string) {
    return request<{ message: Message }>(`/chat/messages/${messageId}`, {
      method: "PATCH",
      body: JSON.stringify({ body })
    });
  },
  deleteMessage(messageId: string) {
    return request<{ message: Message }>(`/chat/messages/${messageId}`, {
      method: "DELETE",
      body: JSON.stringify({ deleted_for_everyone: true })
    });
  },
  createMediaPlaceholder(payload: {
    file_name: string;
    mime_type: string;
    size: number;
    type: "image" | "video" | "document" | "audio";
  }) {
    return request<{ media: { id: string; status: string } }>("/chat/media/upload", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  markDelivered(messageId: string) {
    return request<{ status: MessageStatus }>(`/chat/messages/${messageId}/delivered`, {
      method: "POST"
    });
  },
  markRead(messageId: string) {
    return request<{ status: MessageStatus }>(`/chat/messages/${messageId}/read`, {
      method: "POST"
    });
  },
  startCall(conversationId: string, receiverId: string, type: "voice" | "video") {
    return request<{ call: { id: string } }>("/chat/calls/start", {
      method: "POST",
      body: JSON.stringify({
        conversation_id: conversationId,
        receiver_id: receiverId,
        type
      })
    });
  },
  endCall(callId: string) {
    return request<{ call: unknown }>("/chat/calls/end", {
      method: "POST",
      body: JSON.stringify({
        call_id: callId,
        status: "ended"
      })
    });
  },
  adminOverview() {
    return request<{ overview: AdminOverview }>("/chat/admin/overview");
  }
};
