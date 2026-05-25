import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ChatUser, Conversation, Message } from "../types/chat";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || "http://localhost:3000/api";
const TOKEN_KEY = "chat_platform_token";

export type AuthMode = "signin" | "signup";

export async function getStoredToken() {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function storeToken(token: string) {
  await AsyncStorage.setItem(TOKEN_KEY, token);
}

export async function removeToken() {
  await AsyncStorage.removeItem(TOKEN_KEY);
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getStoredToken();
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
    return request<{ phone: string; mode: AuthMode }>("/chat-auth/request-otp", {
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
  listConversations() {
    return request<{ conversations: Conversation[] }>("/chat/conversations");
  },
  createDirectConversation(phone: string) {
    return request<{ conversation: Conversation }>("/chat/conversations/direct", {
      method: "POST",
      body: JSON.stringify({ phone })
    });
  },
  listMessages(conversationId: string) {
    return request<{ messages: Message[] }>(`/chat/conversations/${conversationId}/messages`);
  },
  sendMessage(conversationId: string, body: string) {
    return request<{ message: Message }>(`/chat/conversations/${conversationId}/messages`, {
      method: "POST",
      body: JSON.stringify({ type: "text", body })
    });
  }
};
