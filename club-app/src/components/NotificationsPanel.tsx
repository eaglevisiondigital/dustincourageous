import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { markNotificationRead } from "../lib/familyActions";
import { readNotificationPage, type NotificationCursor, type NotificationItem } from "../lib/notificationHistory";

export function NotificationsPanel({ userId }: { userId: string }) {
  return <NotificationInbox key={userId} userId={userId} />;
}

function NotificationInbox({ userId }: { userId: string }) {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [next, setNext] = useState<NotificationCursor | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [working, setWorking] = useState(false);
  const [actionError, setActionError] = useState("");
  const version = useRef(0);
  const busy = useRef(false);

  const load = useCallback(async (cursor: NotificationCursor | null = null) => {
    const request = ++version.current;
    busy.current = true;
    setLoading(!cursor); setLoadingMore(!!cursor); setError(""); setActionError("");
    try {
      const page = await readNotificationPage(supabase, userId, cursor);
      if (request !== version.current) return;
      setItems(current => cursor ? [...current, ...page.items.filter(row => !current.some(existing => existing.id === row.id))] : page.items);
      setNext(page.next);
    } catch {
      if (request === version.current) setError(cursor
        ? "Older notifications could not be loaded. Your current list is still here. Try loading older notifications again."
        : "Notifications could not be loaded. Please try again.");
    } finally {
      if (request === version.current) { busy.current = false; setLoading(false); setLoadingMore(false); }
    }
  }, [userId]);

  useEffect(() => {
    void load();
    return () => { version.current++; };
  }, [load]);

  async function markRead(id: string) {
    if (busy.current) return;
    busy.current = true; setWorking(true); setActionError("");
    const request = ++version.current;
    try {
      await markNotificationRead(supabase, userId, id);
      if (request === version.current) setItems(current => current.map(item => item.id === id ? { ...item, status: "read" } : item));
    } catch {
      if (request === version.current) setActionError("Read status could not be saved. Please try again.");
    } finally {
      if (request === version.current) { busy.current = false; setWorking(false); }
    }
  }

  const disabled = loading || loadingMore || working;
  return <section className="family-section-card">
    <div className="section-heading compact-heading">
      <div><p className="eyebrow red">Family Activity</p><h2>Notifications</h2></div>
      {!loading && <span className="pill">{items.filter(item => item.status === "unread").length} unread in {items.length} loaded notifications</span>}
    </div>
    <button type="button" className="secondary-button" disabled={disabled}
      onClick={() => { if (!busy.current) void load(); }}>Refresh notifications</button>
    {actionError && <div className="form-message" role="alert">{actionError}</div>}
    {error && <p role="alert">{error}</p>}
    {loading ? <p role="status">Loading notifications...</p> : <>
      <div className="notification-list">
        {items.map(item => <button type="button" key={item.id}
          disabled={disabled || item.status !== "unread"}
          className={item.status === "unread" ? "notification-row unread" : "notification-row"}
          onClick={() => void markRead(item.id)}>
          <span className="notification-dot" />
          <span><strong>{item.title}</strong><small>{item.body}</small></span>
          <time dateTime={item.created_at}>{new Date(item.created_at).toLocaleDateString()}</time>
        </button>)}
      </div>
      {!items.length && !error && <p className="muted">Adventure Club milestones and family alerts will appear here.</p>}
      {next && <button type="button" className="secondary-button" disabled={disabled}
        onClick={() => { if (!busy.current) void load(next); }}>{loadingMore ? "Loading older notifications..." : "Load older notifications"}</button>}
      {loadingMore && <p role="status">Loading older notifications...</p>}
      {items.length > 0 && !next && !error && <p className="muted">You have reached the end of your notifications.</p>}
    </>}
  </section>;
}
