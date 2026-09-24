import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Notification = {
  id: string;
  title: string;
  body: string;
  status: string;
  created_at: string;
};

export function NotificationsPanel({ userId }: { userId: string }) {
  const [items, setItems] = useState<Notification[]>([]);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const { data, error: loadError } = await supabase
      .from("user_notifications")
      .select("id,title,body,status,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(12);

    if (loadError) {
      setError(loadError.message);
      return;
    }

    setItems((data ?? []) as Notification[]);
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function markRead(id: string) {
    const { error: updateError } = await supabase
      .from("user_notifications")
      .update({ status: "read", read_at: new Date().toISOString() })
      .eq("id", id);

    if (!updateError) {
      setItems((current) =>
        current.map((item) => (item.id === id ? { ...item, status: "read" } : item))
      );
    }
  }

  return (
    <section className="family-section-card">
      <div className="section-heading compact-heading">
        <div>
          <p className="eyebrow red">Family Activity</p>
          <h2>Notifications</h2>
        </div>
        <span className="pill">{items.filter((item) => item.status === "unread").length} unread</span>
      </div>

      {error && <div className="form-message">{error}</div>}

      {items.length ? (
        <div className="notification-list">
          {items.map((item) => (
            <button
              type="button"
              key={item.id}
              className={item.status === "unread" ? "notification-row unread" : "notification-row"}
              onClick={() => item.status === "unread" && void markRead(item.id)}
            >
              <span className="notification-dot" />
              <span>
                <strong>{item.title}</strong>
                <small>{item.body}</small>
              </span>
              <time>{new Date(item.created_at).toLocaleDateString()}</time>
            </button>
          ))}
        </div>
      ) : (
        <p className="muted">Adventure Club milestones and family alerts will appear here.</p>
      )}
    </section>
  );
}
