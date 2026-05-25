import { useEffect, useRef } from "react";
import type { ChatUser, Message } from "../types";
import { MessageBubble } from "./MessageBubble";
import { TypingIndicator } from "./TypingIndicator";

type MessageListProps = {
  messages: Message[];
  currentUser: ChatUser;
  typingUsers: string[];
  searchQuery: string;
  onReply: (message: Message) => void;
  onForward: (message: Message) => void;
  onEdit: (message: Message) => void;
  onDelete: (message: Message) => void;
};

export function MessageList({
  messages,
  currentUser,
  typingUsers,
  searchQuery,
  onReply,
  onForward,
  onEdit,
  onDelete
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const visibleMessages = searchQuery.trim()
    ? messages.filter((message) =>
        `${message.body || ""} ${message.type}`.toLowerCase().includes(searchQuery.trim().toLowerCase())
      )
    : messages;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, typingUsers.length]);

  return (
    <section className="message-list">
      {messages.length === 0 ? (
        <div className="empty-chat">
          <h3>Start the conversation</h3>
          <p>Send a message when you are ready.</p>
        </div>
      ) : null}
      {messages.length > 0 && visibleMessages.length === 0 ? (
        <div className="empty-chat">
          <h3>No matches</h3>
          <p>Try another search.</p>
        </div>
      ) : null}
      {visibleMessages.map((message) => (
        <MessageBubble
          key={message.id}
          message={message}
          currentUser={currentUser}
          onReply={onReply}
          onForward={onForward}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
      <TypingIndicator names={typingUsers} />
      <div ref={bottomRef} />
    </section>
  );
}
