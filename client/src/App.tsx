import { useEffect, useMemo, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import type { CallState, ChatUser, Conversation, Message, MessageStatus } from "./types";
import { api, clearToken, getToken, setToken, type AuthMode } from "./lib/api";
import { createChatSocket } from "./lib/socket";
import { getConversationPeer, getConversationTitle } from "./lib/chat";
import { AuthPanel } from "./components/AuthPanel";
import { ConversationList } from "./components/ConversationList";
import { ChatHeader } from "./components/ChatHeader";
import { MessageList } from "./components/MessageList";
import { MessageInput } from "./components/MessageInput";
import { ProfilePanel } from "./components/ProfilePanel";
import { AdminPanel } from "./components/AdminPanel";
import { IncomingCallModal } from "./components/IncomingCallModal";
import { CallModal } from "./components/CallModal";

type OpenPanel = "profile" | "admin" | null;

export default function App() {
  const [authStep, setAuthStep] = useState<"phone" | "otp">("phone");
  const [authMode, setAuthMode] = useState<AuthMode>("signin");
  const [authPhone, setAuthPhone] = useState("");
  const [currentUser, setCurrentUser] = useState<ChatUser | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [contacts, setContacts] = useState<ChatUser[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [typingUserIds, setTypingUserIds] = useState<string[]>([]);
  const [messageSearch, setMessageSearch] = useState("");
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [openPanel, setOpenPanel] = useState<OpenPanel>(null);
  const [loading, setLoading] = useState(false);
  const [conversationLoading, setConversationLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [incomingCall, setIncomingCall] = useState<CallState | null>(null);
  const [activeCall, setActiveCall] = useState<CallState | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const selectedConversationIdRef = useRef<string | null>(null);
  const currentUserRef = useRef<ChatUser | null>(null);

  useEffect(() => {
    selectedConversationIdRef.current = selectedConversation?.id || null;
  }, [selectedConversation?.id]);

  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  useEffect(() => {
    const token = getToken();

    if (!token) {
      return;
    }

    setLoading(true);
    api
      .me()
      .then(({ user }) => {
        setCurrentUser(user);
        return Promise.all([refreshConversations(), refreshContacts()]);
      })
      .catch(() => clearToken())
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const token = getToken();

    const activeUser = currentUser;

    if (!token || !activeUser) {
      return;
    }

    const socket = createChatSocket(token);
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("user:online");
      if (selectedConversationIdRef.current) {
        socket.emit("conversation:join", {
          conversation_id: selectedConversationIdRef.current
        });
      }
    });

    socket.on("message:new", ({ message }: { message: Message }) => {
      if (message.conversation_id === selectedConversationIdRef.current) {
        setMessages((previous) => appendMessage(previous, message));
        markMessageRead(message);
      }

      refreshConversations();
    });

    socket.on("message:status", ({ status }: { status: MessageStatus }) => {
      setMessages((previous) => updateMessageStatus(previous, status));
    });

    socket.on("typing:update", (payload: { conversation_id: string; user_id: string; is_typing: boolean }) => {
      if (payload.conversation_id !== selectedConversationIdRef.current) {
        return;
      }

      setTypingUserIds((previous) => {
        if (payload.is_typing) {
          return previous.includes(payload.user_id) ? previous : [...previous, payload.user_id];
        }

        return previous.filter((id) => id !== payload.user_id);
      });
    });

    socket.on("user:presence", (payload: { user_id: string; is_online: boolean; user?: ChatUser }) => {
      setConversations((previous) => patchPresence(previous, payload.user_id, payload.is_online));
      setSelectedConversation((previous) =>
        previous ? patchPresence([previous], payload.user_id, payload.is_online)[0] : previous
      );

      if (payload.user_id === currentUserRef.current?.id && payload.user) {
        setCurrentUser(payload.user);
      }
    });

    socket.on("call:incoming", (payload) => {
      setIncomingCall({
        callId: payload.call_id || payload.callId,
        conversationId: payload.conversation_id || payload.conversationId,
        fromUserId: payload.from_user_id || payload.fromUserId,
        targetUserId: activeUser.id,
        type: payload.type || "voice",
        status: "ringing",
        direction: "incoming"
      });
    });

    socket.on("call:status", (payload) => {
      setActiveCall((previous) => {
        if (!previous) {
          return previous;
        }

        return {
          ...previous,
          status: payload.status || previous.status
        };
      });

      if (payload.status === "ended" || payload.status === "rejected") {
        setIncomingCall(null);
      }
    });

    socket.on("error", (payload: { error?: string }) => {
      setError(payload.error || "Realtime connection error");
    });

    return () => {
      socket.emit("user:offline");
      socket.disconnect();
      socketRef.current = null;
    };
  }, [currentUser?.id]);

  const typingNames = useMemo(() => {
    if (!selectedConversation) {
      return [];
    }

    return typingUserIds
      .map((userId) => selectedConversation.participants?.find((participant) => participant.user_id === userId)?.user.name)
      .filter((name): name is string => Boolean(name));
  }, [selectedConversation, typingUserIds]);

  async function refreshConversations() {
    const { conversations: nextConversations } = await api.listConversations();
    setConversations(nextConversations);
    setSelectedConversation((previous) =>
      previous ? nextConversations.find((conversation) => conversation.id === previous.id) || previous : previous
    );
  }

  async function refreshContacts() {
    const { users } = await api.listUsers();
    setContacts(users);
  }

  async function requestOtp(phone: string) {
    setLoading(true);
    setError(null);

    try {
      await api.requestOtp(phone, authMode);
      setAuthPhone(phone);
      setAuthStep("otp");
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp(otp: string, name?: string) {
    setLoading(true);
    setError(null);

    try {
      const result = await api.verifyOtp(authPhone, otp, authMode, name);
      setToken(result.token);
      setCurrentUser(result.user);
      await Promise.all([refreshConversations(), refreshContacts()]);
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function startDirect(phone: string) {
    setError(null);

    try {
      const search = await api.searchUser(phone);

      if (!search.user) {
        setError("No user exists with that phone number yet.");
        return;
      }

      const { conversation } = await api.createDirectConversation(phone);
      await refreshConversations();
      await selectConversation(conversation);
    } catch (error) {
      setError((error as Error).message);
    }
  }

  async function createGroup(title: string, participantIds: string[]) {
    if (!participantIds.length) {
      setError("Add at least one contact to create a group.");
      return;
    }

    try {
      const { conversation } = await api.createGroupConversation(title, participantIds);
      await refreshConversations();
      await selectConversation(conversation);
    } catch (error) {
      setError((error as Error).message);
    }
  }

  async function selectConversation(conversation: Conversation) {
    setSelectedConversation(conversation);
    setTypingUserIds([]);
    setMessageSearch("");
    setReplyTo(null);
    setEditingMessage(null);
    setConversationLoading(true);
    socketRef.current?.emit("conversation:join", {
      conversation_id: conversation.id
    });

    try {
      const { messages: nextMessages } = await api.listMessages(conversation.id);
      setMessages(nextMessages);
      nextMessages.forEach(markMessageRead);
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setConversationLoading(false);
    }
  }

  async function sendMessage(body: string) {
    if (!selectedConversation) {
      return;
    }

    if (editingMessage) {
      const { message } = await api.updateMessage(editingMessage.id, body);
      setMessages((previous) =>
        previous.map((item) => (item.id === message.id ? { ...item, ...message } : item))
      );
      setEditingMessage(null);
      return;
    }

    const payload = {
      conversation_id: selectedConversation.id,
      type: "text",
      body,
      reply_to_message_id: replyTo?.id || null
    };

    if (!socketRef.current?.connected) {
      const { message } = await api.sendMessage(selectedConversation.id, {
        type: "text",
        body,
        reply_to_message_id: replyTo?.id || null
      });
      setMessages((previous) => appendMessage(previous, message));
      setReplyTo(null);
      await refreshConversations();
      return;
    }

    socketRef.current.emit("message:send", payload, (response: { ok: boolean; message?: Message; error?: string }) => {
      if (!response.ok) {
        setError(response.error || "Message failed to send");
        return;
      }

      if (response.message) {
        setMessages((previous) => appendMessage(previous, response.message!));
        setReplyTo(null);
      }
    });
  }

  async function sendMediaPlaceholder(type: "image" | "video" | "document" | "audio") {
    if (!selectedConversation) {
      return;
    }

    try {
      const media = await api.createMediaPlaceholder({
        file_name: `demo-${type}`,
        mime_type: type === "document" ? "application/pdf" : `${type}/demo`,
        size: 0,
        type
      });
      const { message } = await api.sendMessage(selectedConversation.id, {
        type,
        body: `${type} placeholder (${media.media.status})`,
        media_url: `https://example.com/${media.media.id}`,
        media_mime_type: type === "document" ? "application/pdf" : `${type}/demo`,
        media_size: 0,
        reply_to_message_id: replyTo?.id || null
      });
      setMessages((previous) => appendMessage(previous, message));
      setReplyTo(null);
      await refreshConversations();
    } catch (error) {
      setError((error as Error).message);
    }
  }

  async function forwardMessage(message: Message) {
    if (!selectedConversation) {
      return;
    }

    const { message: forwarded } = await api.sendMessage(selectedConversation.id, {
      type: message.type,
      body: message.body || `${message.type} message`,
      media_url: message.media_url || null,
      media_mime_type: message.media_mime_type || null,
      media_size: message.media_size || null,
      is_forwarded: true
    });
    setMessages((previous) => appendMessage(previous, forwarded));
  }

  async function deleteMessage(message: Message) {
    const { message: deleted } = await api.deleteMessage(message.id);
    setMessages((previous) =>
      previous.map((item) => (item.id === deleted.id ? { ...item, ...deleted } : item))
    );
  }

  async function enableNotifications() {
    if (!("Notification" in window)) {
      setError("This browser does not support notifications.");
      return;
    }

    const permission = await Notification.requestPermission();
    setError(permission === "granted" ? "Notifications enabled for this browser." : "Notifications not enabled.");
  }

  function markMessageRead(message: Message) {
    if (!currentUserRef.current || message.sender_id === currentUserRef.current.id) {
      return;
    }

    const socket = socketRef.current;

    if (socket?.connected) {
      socket.emit("message:delivered", { message_id: message.id });
      socket.emit("message:read", { message_id: message.id });
      return;
    }

    api.markDelivered(message.id).catch(() => undefined);
    api.markRead(message.id).catch(() => undefined);
  }

  function emitTyping(isTyping: boolean) {
    if (!selectedConversation) {
      return;
    }

    socketRef.current?.emit(isTyping ? "typing:start" : "typing:stop", {
      conversation_id: selectedConversation.id
    });
  }

  async function updateProfile(payload: { name: string; about: string; avatar_url?: string | null }) {
    const { user } = await api.updateProfile(payload);
    setCurrentUser(user);
    setOpenPanel(null);
  }

  async function startCall(type: "voice" | "video") {
    if (!selectedConversation || !currentUser) {
      return;
    }

    const peer = getConversationPeer(selectedConversation, currentUser);

    if (!peer) {
      setError("Select a direct conversation to call.");
      return;
    }

    try {
      const { call } = await api.startCall(selectedConversation.id, peer.id, type);
      const nextCall: CallState = {
        callId: call.id,
        conversationId: selectedConversation.id,
        targetUserId: peer.id,
        type,
        status: "ringing",
        direction: "outgoing"
      };
      setActiveCall(nextCall);
      socketRef.current?.emit("call:offer", {
        call_id: call.id,
        conversation_id: selectedConversation.id,
        to_user_id: peer.id,
        type,
        offer: { type: "offer", sdp: "phase-1-signaling-placeholder" }
      });
    } catch (error) {
      setError((error as Error).message);
    }
  }

  function acceptIncomingCall() {
    if (!incomingCall) {
      return;
    }

    setActiveCall({
      ...incomingCall,
      status: "accepted"
    });
    socketRef.current?.emit("call:accepted", {
      call_id: incomingCall.callId,
      conversation_id: incomingCall.conversationId,
      to_user_id: incomingCall.fromUserId
    });
    socketRef.current?.emit("call:answer", {
      call_id: incomingCall.callId,
      conversation_id: incomingCall.conversationId,
      to_user_id: incomingCall.fromUserId,
      answer: { type: "answer", sdp: "phase-1-signaling-placeholder" }
    });
    setIncomingCall(null);
  }

  function rejectIncomingCall() {
    if (!incomingCall) {
      return;
    }

    socketRef.current?.emit("call:rejected", {
      call_id: incomingCall.callId,
      conversation_id: incomingCall.conversationId,
      to_user_id: incomingCall.fromUserId
    });
    setIncomingCall(null);
  }

  async function endActiveCall() {
    if (!activeCall) {
      return;
    }

    if (activeCall.callId) {
      api.endCall(activeCall.callId).catch(() => undefined);
    }

    socketRef.current?.emit("call:ended", {
      call_id: activeCall.callId,
      conversation_id: activeCall.conversationId,
      to_user_id: activeCall.targetUserId || activeCall.fromUserId
    });
    setActiveCall(null);
  }

  function logout() {
    socketRef.current?.emit("user:offline");
    socketRef.current?.disconnect();
    clearToken();
    setCurrentUser(null);
    setConversations([]);
    setContacts([]);
    setSelectedConversation(null);
    setMessages([]);
    setMessageSearch("");
    setReplyTo(null);
    setEditingMessage(null);
    setAuthStep("phone");
  }

  if (!currentUser) {
    return (
      <AuthPanel
        step={authStep}
        phone={authPhone}
        mode={authMode}
        loading={loading}
        error={error}
        onModeChange={(mode) => {
          setAuthMode(mode);
          setError(null);
        }}
        onPhoneSubmit={requestOtp}
        onOtpSubmit={verifyOtp}
        onBack={() => setAuthStep("phone")}
      />
    );
  }

  const callTitle = selectedConversation
    ? getConversationTitle(selectedConversation, currentUser)
    : "Call";
  const incomingCaller =
    selectedConversation?.participants?.find((participant) => participant.user_id === incomingCall?.fromUserId)?.user.name ||
    "Contact";

  return (
    <main className="app-shell">
      <ConversationList
        conversations={conversations}
        currentUser={currentUser}
        selectedId={selectedConversation?.id}
        loading={loading}
        contacts={contacts}
        onSelect={selectConversation}
        onStartDirect={startDirect}
        onCreateGroup={createGroup}
        onOpenProfile={() => setOpenPanel("profile")}
        onOpenAdmin={() => setOpenPanel("admin")}
        onLogout={logout}
      />

      <section className="chat-pane">
        {selectedConversation ? (
          <>
            <ChatHeader
              conversation={selectedConversation}
              currentUser={currentUser}
              searchQuery={messageSearch}
              onSearchChange={setMessageSearch}
              onEnableNotifications={enableNotifications}
              onCall={startCall}
            />
            {conversationLoading ? (
              <div className="empty-chat">
                <h3>Loading chat</h3>
              </div>
            ) : (
              <MessageList
                messages={messages}
                currentUser={currentUser}
                typingUsers={typingNames}
                searchQuery={messageSearch}
                onReply={(message) => {
                  setReplyTo(message);
                  setEditingMessage(null);
                }}
                onForward={forwardMessage}
                onEdit={(message) => {
                  setEditingMessage(message);
                  setReplyTo(null);
                }}
                onDelete={deleteMessage}
              />
            )}
            <MessageInput
              disabled={conversationLoading}
              replyTo={replyTo}
              editing={editingMessage}
              onCancelContext={() => {
                setReplyTo(null);
                setEditingMessage(null);
              }}
              onSend={sendMessage}
              onMediaPlaceholder={sendMediaPlaceholder}
              onTypingStart={() => emitTyping(true)}
              onTypingStop={() => emitTyping(false)}
            />
          </>
        ) : (
          <div className="empty-chat full">
            <h2>Choose a conversation</h2>
            <p>Search by phone number or open an existing thread.</p>
          </div>
        )}
      </section>

      {openPanel === "profile" ? (
        <ProfilePanel user={currentUser} onClose={() => setOpenPanel(null)} onSave={updateProfile} />
      ) : null}
      {openPanel === "admin" ? <AdminPanel onClose={() => setOpenPanel(null)} /> : null}
      {incomingCall ? (
        <IncomingCallModal
          call={incomingCall}
          callerName={incomingCaller}
          onAccept={acceptIncomingCall}
          onReject={rejectIncomingCall}
        />
      ) : null}
      {activeCall ? <CallModal call={activeCall} title={callTitle} onEnd={endActiveCall} /> : null}
      {error ? (
        <button className="toast" onClick={() => setError(null)}>
          {error}
        </button>
      ) : null}
    </main>
  );
}

function appendMessage(messages: Message[], message: Message) {
  if (messages.some((existing) => existing.id === message.id)) {
    return messages;
  }

  return [...messages, message];
}

function updateMessageStatus(messages: Message[], status: MessageStatus) {
  return messages.map((message) => {
    if (message.id !== status.message_id) {
      return message;
    }

    const statuses = message.statuses || [];
    const existing = statuses.find((item) => item.user_id === status.user_id);
    const nextStatuses = existing
      ? statuses.map((item) => (item.user_id === status.user_id ? { ...item, ...status } : item))
      : [...statuses, status];

    return {
      ...message,
      statuses: nextStatuses
    };
  });
}

function patchPresence(conversations: Conversation[], userId: string, isOnline: boolean) {
  return conversations.map((conversation) => ({
    ...conversation,
    participants: conversation.participants?.map((participant) =>
      participant.user_id === userId
        ? {
            ...participant,
            user: {
              ...participant.user,
              is_online: isOnline,
              last_seen_at: isOnline ? null : new Date().toISOString()
            }
          }
        : participant
    )
  }));
}
