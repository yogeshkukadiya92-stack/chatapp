import { FormEvent, useMemo, useState } from "react";
import { LogOut, Search, Settings, Shield, UserPlus } from "lucide-react";
import type { ChatUser, Conversation } from "../types";
import { Avatar } from "./Avatar";
import { formatTime, getConversationSubtitle, getConversationTitle } from "../lib/chat";

type ConversationListProps = {
  conversations: Conversation[];
  currentUser: ChatUser;
  selectedId?: string;
  loading: boolean;
  contacts: ChatUser[];
  onSelect: (conversation: Conversation) => void;
  onStartDirect: (phone: string) => Promise<void>;
  onCreateGroup: (title: string, participantIds: string[]) => Promise<void>;
  onOpenProfile: () => void;
  onOpenAdmin: () => void;
  onLogout: () => void;
};

export function ConversationList({
  conversations,
  currentUser,
  selectedId,
  loading,
  contacts,
  onSelect,
  onStartDirect,
  onCreateGroup,
  onOpenProfile,
  onOpenAdmin,
  onLogout
}: ConversationListProps) {
  const [query, setQuery] = useState("");
  const [phone, setPhone] = useState("");
  const [groupTitle, setGroupTitle] = useState("Test group");

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();

    if (!needle) {
      return conversations;
    }

    return conversations.filter((conversation) =>
      getConversationTitle(conversation, currentUser).toLowerCase().includes(needle)
    );
  }, [conversations, currentUser, query]);

  async function submitDirect(event: FormEvent) {
    event.preventDefault();
    if (!phone.trim()) {
      return;
    }

    await onStartDirect(phone);
    setPhone("");
  }

  return (
    <aside className="conversation-rail">
      <header className="rail-header">
        <div className="current-user">
          <Avatar name={currentUser.name} image={currentUser.avatar_url} online={currentUser.is_online} />
          <div>
            <strong>{currentUser.name}</strong>
            <span>{currentUser.phone}</span>
          </div>
        </div>
        <div className="icon-row">
          {currentUser.role === "admin" ? (
            <button className="icon-button" onClick={onOpenAdmin} aria-label="Admin">
              <Shield size={18} />
            </button>
          ) : null}
          <button className="icon-button" onClick={onOpenProfile} aria-label="Profile settings">
            <Settings size={18} />
          </button>
          <button className="icon-button" onClick={onLogout} aria-label="Log out">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <form className="direct-form" onSubmit={submitDirect}>
        <div className="input-with-icon compact">
          <UserPlus size={16} />
          <input
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="Start chat by phone"
            autoComplete="off"
          />
        </div>
      </form>

      <div className="search-box">
        <Search size={16} />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search conversations"
        />
      </div>

      <form
        className="group-form"
        onSubmit={(event) => {
          event.preventDefault();
          onCreateGroup(
            groupTitle,
            contacts.map((user) => user.id)
          );
        }}
      >
        <input
          value={groupTitle}
          onChange={(event) => setGroupTitle(event.target.value)}
          placeholder="Group name"
        />
        <button className="primary-button" disabled={!contacts.length || !groupTitle.trim()}>
          Create group
        </button>
      </form>

      <div className="conversation-list">
        {loading ? <p className="muted-note">Loading conversations...</p> : null}
        {!loading && filtered.length === 0 ? <p className="muted-note">No conversations yet.</p> : null}
        {filtered.map((conversation) => (
          <button
            key={conversation.id}
            className={conversation.id === selectedId ? "conversation-row selected" : "conversation-row"}
            onClick={() => onSelect(conversation)}
          >
            <Avatar
              name={getConversationTitle(conversation, currentUser)}
              image={conversation.avatar_url}
              online={conversation.type === "direct" ? conversation.participants?.some((p) => p.user_id !== currentUser.id && p.user.is_online) : undefined}
            />
            <span className="conversation-copy">
              <strong>{getConversationTitle(conversation, currentUser)}</strong>
              <small>{getConversationSubtitle(conversation, currentUser)}</small>
            </span>
            <time>{formatTime(conversation.last_message_at || conversation.updated_at || conversation.created_at)}</time>
          </button>
        ))}

        <div className="contacts-section">
          <strong>All Contacts</strong>
          {contacts.length === 0 ? <p className="muted-note">No users found.</p> : null}
          {contacts.map((user) => (
            <button
              key={user.id}
              className="contact-row"
              onClick={() => onStartDirect(user.phone)}
              title={`Start chat with ${user.phone}`}
            >
              <Avatar name={user.name} image={user.avatar_url} online={user.is_online} />
              <span className="conversation-copy">
                <strong>{user.name}</strong>
                <small>{user.phone}</small>
              </span>
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}
