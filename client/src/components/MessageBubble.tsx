import type { ChatUser, Message } from "../types";
import { formatTime, getMessageStatus } from "../lib/chat";
import { Check, CheckCheck, Copy, Forward, Pencil, Reply, Trash2 } from "lucide-react";

type MessageBubbleProps = {
  message: Message;
  currentUser: ChatUser;
  onReply: (message: Message) => void;
  onForward: (message: Message) => void;
  onEdit: (message: Message) => void;
  onDelete: (message: Message) => void;
};

export function MessageBubble({
  message,
  currentUser,
  onReply,
  onForward,
  onEdit,
  onDelete
}: MessageBubbleProps) {
  const outgoing = message.sender_id === currentUser.id;
  const status = getMessageStatus(message, currentUser);
  const statusLabel = getStatusLabel(status);

  return (
    <article className={outgoing ? "message-bubble outgoing" : "message-bubble incoming"}>
      {message.is_forwarded ? <span className="message-meta">Forwarded</span> : null}
      {message.reply_to_message_id ? <span className="reply-strip">Reply message</span> : null}
      {message.is_deleted ? (
        <p className="deleted-copy">This message was deleted</p>
      ) : (
        <p>{renderMessageBody(message)}</p>
      )}
      <footer>
        <time>{formatTime(message.created_at)}</time>
        {outgoing ? (
          <span className={`status status-${status}`}>
            {status === "sent" ? <Check size={13} /> : <CheckCheck size={13} />}
            {statusLabel}
          </span>
        ) : null}
      </footer>
      {!message.is_deleted ? (
        <div className="message-actions">
          <button type="button" onClick={() => onReply(message)} title="Reply" aria-label="Reply">
            <Reply size={13} />
          </button>
          <button type="button" onClick={() => onForward(message)} title="Forward" aria-label="Forward">
            <Forward size={13} />
          </button>
          <button
            type="button"
            onClick={() => navigator.clipboard?.writeText(message.body || "")}
            title="Copy"
            aria-label="Copy"
          >
            <Copy size={13} />
          </button>
          {outgoing && message.type === "text" ? (
            <button type="button" onClick={() => onEdit(message)} title="Edit" aria-label="Edit">
              <Pencil size={13} />
            </button>
          ) : null}
          {outgoing ? (
            <button type="button" onClick={() => onDelete(message)} title="Delete" aria-label="Delete">
              <Trash2 size={13} />
            </button>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

function renderMessageBody(message: Message) {
  if (message.type === "text" || message.type === "location") {
    return message.body;
  }

  if (message.media_url) {
    return `${message.type} attachment`;
  }

  return message.body || `${message.type} message`;
}

function getStatusLabel(status: string) {
  if (status === "read") {
    return "Read";
  }

  if (status === "delivered") {
    return "Delivered";
  }

  return "Sent";
}
