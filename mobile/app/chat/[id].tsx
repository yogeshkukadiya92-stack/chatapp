import { useEffect, useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import type { Socket } from "socket.io-client";
import { api } from "../../src/api/client";
import { useAuth } from "../../src/state/AuthContext";
import { createMobileSocket } from "../../src/services/socket";
import { sendCallOffer } from "../../src/services/calls";
import { MessageBubble } from "../../src/components/MessageBubble";
import type { Message } from "../../src/types/chat";

export default function ChatScreen() {
  const { id, title, peerId } = useLocalSearchParams<{
    id: string;
    title?: string;
    peerId?: string;
  }>();
  const { user, token } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState("");
  const [typing, setTyping] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!user || !token) {
      router.replace("/");
      return;
    }

    api.listMessages(id).then((result) => setMessages(result.messages)).catch(() => undefined);

    const socket = createMobileSocket(token);
    socketRef.current = socket;
    socket.on("connect", () => {
      socket.emit("user:online");
      socket.emit("conversation:join", { conversation_id: id });
    });
    socket.on("message:new", ({ message }: { message: Message }) => {
      if (message.conversation_id === id) {
        setMessages((previous) =>
          previous.some((existing) => existing.id === message.id) ? previous : [...previous, message]
        );
      }
    });
    socket.on("typing:update", (payload: { conversation_id: string; user_id: string; is_typing: boolean }) => {
      if (payload.conversation_id === id && payload.user_id !== user.id) {
        setTyping(payload.is_typing);
      }
    });

    return () => {
      socket.emit("conversation:leave", { conversation_id: id });
      socket.disconnect();
      socketRef.current = null;
    };
  }, [id, token, user]);

  async function send() {
    const nextBody = body.trim();

    if (!nextBody) {
      return;
    }

    setBody("");
    socketRef.current?.emit("typing:stop", { conversation_id: id });

    if (socketRef.current?.connected) {
      socketRef.current.emit(
        "message:send",
        {
          conversation_id: id,
          type: "text",
          body: nextBody
        },
        (response: { ok: boolean; message?: Message }) => {
          if (response.ok && response.message) {
            setMessages((previous) =>
              previous.some((existing) => existing.id === response.message?.id)
                ? previous
                : [...previous, response.message!]
            );
          }
        }
      );
      return;
    }

    const result = await api.sendMessage(id, nextBody);
    setMessages((previous) => [...previous, result.message]);
  }

  function updateBody(value: string) {
    setBody(value);
    socketRef.current?.emit("typing:start", { conversation_id: id });
  }

  function startCall(type: "voice" | "video") {
    if (!peerId) {
      return;
    }

    sendCallOffer(socketRef.current, {
      conversationId: id,
      toUserId: peerId,
      type
    });
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.link}>Back</Text>
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.title}>{title || "Chat"}</Text>
          <Text style={styles.subtitle}>{typing ? "Typing..." : "Online when active"}</Text>
        </View>
        <View style={styles.callButtons}>
          <Pressable onPress={() => startCall("voice")}>
            <Text style={styles.link}>Voice</Text>
          </Pressable>
          <Pressable onPress={() => startCall("video")}>
            <Text style={styles.link}>Video</Text>
          </Pressable>
        </View>
      </View>
      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={80}
      >
        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messages}
          renderItem={({ item }) => <MessageBubble message={item} currentUserId={user?.id || ""} />}
        />
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={body}
            onChangeText={updateBody}
            placeholder="Message"
            multiline
          />
          <Pressable style={styles.sendButton} onPress={send}>
            <Text style={styles.sendText}>Send</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#eef2f8"
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#ffffff"
  },
  headerText: {
    flex: 1
  },
  title: {
    color: "#111827",
    fontSize: 18,
    fontWeight: "800"
  },
  subtitle: {
    color: "#64748b"
  },
  link: {
    color: "#4f46e5",
    fontWeight: "800"
  },
  callButtons: {
    flexDirection: "row",
    gap: 10
  },
  content: {
    flex: 1
  },
  messages: {
    padding: 14
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    padding: 12,
    backgroundColor: "#ffffff"
  },
  input: {
    flex: 1,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: "#dbe3ef",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16
  },
  sendButton: {
    minHeight: 44,
    justifyContent: "center",
    borderRadius: 8,
    paddingHorizontal: 16,
    backgroundColor: "#4f46e5"
  },
  sendText: {
    color: "#ffffff",
    fontWeight: "800"
  }
});
