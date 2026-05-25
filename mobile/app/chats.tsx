import { useEffect, useState } from "react";
import { FlatList, Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { api } from "../src/api/client";
import { useAuth } from "../src/state/AuthContext";
import type { ChatUser, Conversation } from "../src/types/chat";

export default function ChatsScreen() {
  const { user, signOut } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      router.replace("/");
      return;
    }

    refresh();
  }, [user]);

  async function refresh() {
    const result = await api.listConversations();
    setConversations(result.conversations);
  }

  async function startDirect() {
    setError(null);

    try {
      const result = await api.createDirectConversation(phone);
      setPhone("");
      await refresh();
      openConversation(result.conversation);
    } catch (error) {
      setError((error as Error).message);
    }
  }

  function openConversation(conversation: Conversation) {
    const title = getConversationTitle(conversation, user);
    const peer = conversation.participants?.find((participant) => participant.user_id !== user?.id)?.user;
    router.push({
      pathname: "/chat/[id]",
      params: {
        id: conversation.id,
        title,
        peerId: peer?.id || ""
      }
    });
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Chats</Text>
          <Text style={styles.subtitle}>{user?.phone}</Text>
        </View>
        <Pressable onPress={signOut}>
          <Text style={styles.link}>Log out</Text>
        </Pressable>
      </View>
      <View style={styles.startRow}>
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          placeholder="Start by phone"
          keyboardType="phone-pad"
        />
        <Pressable style={styles.smallButton} onPress={startDirect}>
          <Text style={styles.buttonText}>Start</Text>
        </Pressable>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Pressable style={styles.row} onPress={() => openConversation(item)}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{getConversationTitle(item, user).slice(0, 1).toUpperCase()}</Text>
            </View>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>{getConversationTitle(item, user)}</Text>
              <Text style={styles.rowSubtitle}>{item.type === "group" ? "Group" : "Direct"}</Text>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No conversations yet.</Text>}
      />
    </SafeAreaView>
  );
}

function getConversationTitle(conversation: Conversation, currentUser?: ChatUser | null) {
  if (conversation.type === "group") {
    return conversation.title || "Group chat";
  }

  return conversation.participants?.find((participant) => participant.user_id !== currentUser?.id)?.user.name || "Direct chat";
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#eef2f8"
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 14,
    backgroundColor: "#ffffff"
  },
  title: {
    color: "#111827",
    fontSize: 28,
    fontWeight: "800"
  },
  subtitle: {
    color: "#64748b"
  },
  link: {
    color: "#4f46e5",
    fontWeight: "800"
  },
  startRow: {
    flexDirection: "row",
    gap: 10,
    padding: 14
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#dbe3ef",
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: "#ffffff"
  },
  smallButton: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    paddingHorizontal: 16,
    backgroundColor: "#4f46e5"
  },
  buttonText: {
    color: "#ffffff",
    fontWeight: "800"
  },
  error: {
    color: "#dc2626",
    marginHorizontal: 16,
    fontWeight: "700"
  },
  list: {
    padding: 10
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    backgroundColor: "#ffffff"
  },
  avatar: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "#4f46e5"
  },
  avatarText: {
    color: "#ffffff",
    fontWeight: "900"
  },
  rowText: {
    flex: 1
  },
  rowTitle: {
    color: "#111827",
    fontWeight: "800"
  },
  rowSubtitle: {
    color: "#64748b"
  },
  empty: {
    marginTop: 32,
    textAlign: "center",
    color: "#64748b"
  }
});
