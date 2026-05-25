import { FormEvent, useState } from "react";
import { X } from "lucide-react";
import type { ChatUser } from "../types";

type ProfilePanelProps = {
  user: ChatUser;
  onClose: () => void;
  onSave: (payload: { name: string; about: string; avatar_url?: string | null }) => Promise<void>;
};

export function ProfilePanel({ user, onClose, onSave }: ProfilePanelProps) {
  const [name, setName] = useState(user.name);
  const [about, setAbout] = useState(user.about || "");
  const [avatarUrl, setAvatarUrl] = useState(user.avatar_url || "");

  async function submit(event: FormEvent) {
    event.preventDefault();
    await onSave({
      name,
      about,
      avatar_url: avatarUrl || null
    });
  }

  return (
    <aside className="side-panel">
      <header>
        <h2>Profile</h2>
        <button className="icon-button" onClick={onClose} aria-label="Close profile">
          <X size={18} />
        </button>
      </header>
      <form className="settings-form" onSubmit={submit}>
        <label htmlFor="profile-name">Name</label>
        <input id="profile-name" value={name} onChange={(event) => setName(event.target.value)} />
        <label htmlFor="profile-about">About</label>
        <textarea
          id="profile-about"
          value={about}
          onChange={(event) => setAbout(event.target.value)}
          maxLength={160}
        />
        <label htmlFor="profile-avatar">Avatar URL</label>
        <input
          id="profile-avatar"
          value={avatarUrl}
          onChange={(event) => setAvatarUrl(event.target.value)}
          placeholder="https://..."
        />
        <button className="primary-button">Save</button>
      </form>
    </aside>
  );
}
