import { FormEvent, useEffect, useRef, useState } from "react";
import { Paperclip, Send, Smile, X } from "lucide-react";
import type { Message } from "../types";

type MessageInputProps = {
  disabled?: boolean;
  replyTo?: Message | null;
  editing?: Message | null;
  onCancelContext: () => void;
  onSend: (body: string) => Promise<void>;
  onMediaPlaceholder: (type: "image" | "video" | "document" | "audio") => Promise<void>;
  onTypingStart: () => void;
  onTypingStop: () => void;
};

export function MessageInput({
  disabled,
  replyTo,
  editing,
  onCancelContext,
  onSend,
  onMediaPlaceholder,
  onTypingStart,
  onTypingStop
}: MessageInputProps) {
  const [body, setBody] = useState("");
  const [showMediaMenu, setShowMediaMenu] = useState(false);
  const [showEmojiMenu, setShowEmojiMenu] = useState(false);
  const typingTimeout = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (typingTimeout.current) {
        window.clearTimeout(typingTimeout.current);
      }
    };
  }, []);

  useEffect(() => {
    setBody(editing?.body || "");
  }, [editing?.id]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const nextBody = body.trim();

    if (!nextBody) {
      return;
    }

    setBody("");
    onTypingStop();
    await onSend(nextBody);
  }

  function handleChange(value: string) {
    setBody(value);
    onTypingStart();

    if (typingTimeout.current) {
      window.clearTimeout(typingTimeout.current);
    }

    typingTimeout.current = window.setTimeout(onTypingStop, 1200);
  }

  return (
    <div className="composer-wrap">
      {replyTo || editing ? (
        <div className="composer-context">
          <span>{editing ? "Editing" : "Replying to"}: {(editing || replyTo)?.body || (editing || replyTo)?.type}</span>
          <button type="button" onClick={onCancelContext} aria-label="Cancel">
            <X size={14} />
          </button>
        </div>
      ) : null}
      <form className="message-input" onSubmit={submit}>
        <div className="composer-menu-wrap">
          <button
            className="icon-button"
            type="button"
            aria-label="Add attachment"
            disabled={disabled}
            onClick={() => setShowMediaMenu((value) => !value)}
          >
            <Paperclip size={18} />
          </button>
          {showMediaMenu ? (
            <div className="composer-menu">
              {(["image", "video", "document", "audio"] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    setShowMediaMenu(false);
                    onMediaPlaceholder(type);
                  }}
                >
                  {type}
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <div className="composer-menu-wrap">
          <button
            className="icon-button"
            type="button"
            aria-label="Emoji"
            disabled={disabled}
            onClick={() => setShowEmojiMenu((value) => !value)}
          >
            <Smile size={18} />
          </button>
          {showEmojiMenu ? (
            <div className="composer-menu emoji-menu">
              {["😀", "😂", "👍", "❤️", "🙏", "🔥"].map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    setBody((value) => `${value}${emoji}`);
                    setShowEmojiMenu(false);
                  }}
                >
                  {emoji}
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <input
          value={body}
          onChange={(event) => handleChange(event.target.value)}
          placeholder={editing ? "Edit message" : "Message"}
          disabled={disabled}
        />
        <button className="send-button" disabled={disabled || !body.trim()} aria-label="Send message">
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}
