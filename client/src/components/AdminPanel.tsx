import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { api } from "../lib/api";
import type { AdminOverview } from "../types";

type AdminPanelProps = {
  onClose: () => void;
};

export function AdminPanel({ onClose }: AdminPanelProps) {
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .adminOverview()
      .then((result) => setOverview(result.overview))
      .catch((error: Error) => setError(error.message));
  }, []);

  return (
    <aside className="side-panel wide">
      <header>
        <h2>Admin</h2>
        <button className="icon-button" onClick={onClose} aria-label="Close admin">
          <X size={18} />
        </button>
      </header>
      {error ? <p className="form-error">{error}</p> : null}
      <div className="admin-grid">
        <Metric label="Total users" value={overview?.total_users} />
        <Metric label="Conversations" value={overview?.total_conversations} />
        <Metric label="Messages" value={overview?.total_messages} />
        <Metric label="Active today" value={overview?.active_users_today} />
      </div>
      <section className="admin-section">
        <h3>Recent calls</h3>
        {overview?.recent_call_logs?.length ? (
          overview.recent_call_logs.map((call, index) => (
            <pre key={String(call.id || index)}>{JSON.stringify(call, null, 2)}</pre>
          ))
        ) : (
          <p className="muted-note">No call logs yet.</p>
        )}
      </section>
      <section className="admin-section">
        <h3>Reported users</h3>
        <p className="muted-note">Moderation queue placeholder.</p>
      </section>
    </aside>
  );
}

function Metric({ label, value }: { label: string; value?: number }) {
  return (
    <article className="metric">
      <strong>{value ?? "--"}</strong>
      <span>{label}</span>
    </article>
  );
}
