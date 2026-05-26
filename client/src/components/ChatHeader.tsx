import { ArrowLeft, Bell, Lock, Phone, Search, Unlock, Video } from "lucide-react";
import type { ChatUser, Conversation } from "../types";
import { getConversationPeer, getConversationSubtitle, getConversationTitle } from "../lib/chat";
import { Avatar } from "./Avatar";

type ChatHeaderProps = {
  conversation: Conversation;
  currentUser: ChatUser;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onEnableNotifications: () => void;
  onCall: (type: "voice" | "video") => void;
  locked?: boolean;
  onToggleLock: () => void;
  onBack?: () => void;
};

export function ChatHeader({
  conversation,
  currentUser,
  searchQuery,
  onSearchChange,
  onEnableNotifications,
  onCall,
  locked,
  onToggleLock,
  onBack
}: ChatHeaderProps) {
  const peer = getConversationPeer(conversation, currentUser);

  return (
    <header className="chat-header">
      <div className="chat-title-row">
        {onBack ? (
          <button className="icon-button mobile-back-button" onClick={onBack} aria-label="Back to chats">
            <ArrowLeft size={20} />
          </button>
        ) : null}
        <Avatar
          name={getConversationTitle(conversation, currentUser)}
          image={conversation.avatar_url || peer?.avatar_url}
          online={conversation.type === "direct" ? peer?.is_online : undefined}
        />
        <div>
          <h2>{getConversationTitle(conversation, currentUser)}</h2>
          <p>{getConversationSubtitle(conversation, currentUser)}</p>
        </div>
      </div>
      <div className="icon-row">
        <div className="chat-search">
          <Search size={15} />
          <input
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search"
            aria-label="Search messages"
          />
        </div>
        <button className="icon-button" onClick={onEnableNotifications} aria-label="Enable notifications">
          <Bell size={18} />
        </button>
        <button
          className={locked ? "icon-button lock-active" : "icon-button"}
          onClick={onToggleLock}
          aria-label={locked ? "Unlock chat privacy" : "Lock chat privacy"}
          title={locked ? "Unlock chat" : "Lock chat"}
        >
          {locked ? <Lock size={18} /> : <Unlock size={18} />}
        </button>
        <button className="icon-button" onClick={() => onCall("voice")} aria-label="Start voice call">
          <Phone size={18} />
        </button>
        <button className="icon-button" onClick={() => onCall("video")} aria-label="Start video call">
          <Video size={18} />
        </button>
      </div>
    </header>
  );
}
