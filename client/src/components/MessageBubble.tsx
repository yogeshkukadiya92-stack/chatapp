import type { ChatUser, Message } from "../types";
import { formatTime, getMessageStatus } from "../lib/chat";
import { Check, CheckCheck, Copy, Download, FileText, Forward, Pencil, Reply, Trash2 } from "lucide-react";

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
        renderMessageBody(message)
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
    return <p>{message.body}</p>;
  }

  if (!message.media_url) {
    return <p>{message.body || `${message.type} message`}</p>;
  }

  if (message.type === "image") {
    return (
      <div className="media-message">
        <img src={message.media_url} alt={message.body || "Shared image"} loading="lazy" />
        {message.body ? <p>{message.body}</p> : null}
      </div>
    );
  }

  if (message.type === "video") {
    return (
      <div className="media-message">
        <video src={message.media_url} controls preload="metadata" />
        {message.body ? <p>{message.body}</p> : null}
      </div>
    );
  }

  if (message.type === "audio") {
    return (
      <div className="media-message">
        <audio src={message.media_url} controls />
        {message.body ? <p>{message.body}</p> : null}
      </div>
    );
  }

  return (
    <a className="document-message" href={message.media_url} target="_blank" rel="noreferrer">
      <FileText size={22} />
      <span>
        <strong>{message.body || "Document"}</strong>
        <small>{formatBytes(message.media_size)}</small>
      </span>
      <Download size={18} />
    </a>
  );
}

function formatBytes(size?: number | null) {
  if (!size) {
    return "Attachment";
  }

  if (size < 1024 * 1024) {
    return `${Math.max(1, Math.round(size / 1024))} KB`;
  }

  return `${(size / 1024 / 1024).toFixed(1)} MB`;
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
