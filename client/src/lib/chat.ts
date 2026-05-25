import type { ChatUser, Conversation, Message } from "../types";

export function getConversationPeer(conversation: Conversation | null, currentUser?: ChatUser | null) {
  if (!conversation?.participants || !currentUser) {
    return null;
  }

  return conversation.participants.find((participant) => participant.user_id !== currentUser.id)?.user || null;
}

export function getConversationTitle(conversation: Conversation, currentUser?: ChatUser | null) {
  if (conversation.type === "group") {
    return conversation.title || "Group chat";
  }

  return getConversationPeer(conversation, currentUser)?.name || "Direct chat";
}

export function getConversationSubtitle(conversation: Conversation, currentUser?: ChatUser | null) {
  if (conversation.type === "group") {
    const count = conversation.participants?.length || 0;
    return `${count} participants`;
  }

  const peer = getConversationPeer(conversation, currentUser);

  if (!peer) {
    return "No participant";
  }

  if (peer.is_online) {
    return "Online";
  }

  return peer.last_seen_at ? `Last seen ${formatTime(peer.last_seen_at)}` : "Offline";
}

export function getMessageStatus(message: Message, currentUser?: ChatUser | null) {
  if (!currentUser || message.sender_id !== currentUser.id) {
    return "";
  }

  const recipientStatuses = (message.statuses || []).filter((status) => status.user_id !== currentUser.id);

  if (!recipientStatuses.length) {
    return "sent";
  }

  if (recipientStatuses.every((status) => status.status === "read")) {
    return "read";
  }

  if (recipientStatuses.some((status) => status.status === "delivered")) {
    return "delivered";
  }

  return "sent";
}

export function formatTime(value?: string | null) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

export function initials(name?: string | null) {
  return (name || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}
