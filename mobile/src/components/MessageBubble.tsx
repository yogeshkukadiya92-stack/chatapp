import { StyleSheet, Text, View } from "react-native";
import type { Message } from "../types/chat";

type MessageBubbleProps = {
  message: Message;
  currentUserId: string;
};

export function MessageBubble({ message, currentUserId }: MessageBubbleProps) {
  const outgoing = message.sender_id === currentUserId;

  return (
    <View style={[styles.bubble, outgoing ? styles.outgoing : styles.incoming]}>
      <Text style={styles.text}>{message.is_deleted ? "This message was deleted" : message.body}</Text>
      <Text style={styles.time}>
        {new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(
          new Date(message.created_at)
        )}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    maxWidth: "82%",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginVertical: 4
  },
  incoming: {
    alignSelf: "flex-start",
    backgroundColor: "#ffffff"
  },
  outgoing: {
    alignSelf: "flex-end",
    backgroundColor: "#e0e7ff"
  },
  text: {
    color: "#111827",
    fontSize: 16,
    lineHeight: 22
  },
  time: {
    alignSelf: "flex-end",
    color: "#64748b",
    fontSize: 11,
    marginTop: 4
  }
});
