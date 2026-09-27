import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { markNotificationRead, markLoadedNotificationsRead } from "../lib/familyActions";
import { readNotificationPage, type NotificationCursor, type NotificationItem, type NotificationFilter } from "../lib/notificationHistory";

export function NotificationsPanel({ userId }: { userId: string }) {
  const [filter, setFilter] = useState<NotificationFilter>("all");
  return <section className="family-section-card">
    <div className="section-heading compact-heading"><div><p className="eyebrow red">Family Activity</p><h2>Notifications</h2></div></div>
    <label className="notification-filter">Show Notifications<select value={filter} onChange={event => setFilter(event.target.value as NotificationFilter)}>
      <option value="all">All Notifications</option><option value="unread">Unread Only</option>
    </select></label>
    <NotificationInbox key={`${userId}:${filter}`} userId={userId} filter={filter} />
  </section>;
}

function NotificationInbox({ userId, filter }: { userId: string; filter: NotificationFilter }) {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [next, setNext] = useState<NotificationCursor | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");
  const [actionError, setActionError] = useState("");
  const version = useRef(0);
  const busy = useRef(false);

  const load = useCallback(async (cursor: NotificationCursor | null = null) => {
    const request = ++version.current;
    busy.current = true;
    setLoading(!cursor); setLoadingMore(!!cursor); setError(""); setActionError(""); setMessage("");
    try {
      const page = await readNotificationPage(supabase, userId, cursor, filter);
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
  }, [userId, filter]);

  useEffect(() => {
    void load();
    return () => { version.current++; };
  }, [load]);

  async function markRead(id: string) {
    if (busy.current) return;
    busy.current = true; setWorking(true); setActionError(""); setMessage("");
    const request = ++version.current;
    try {
      await markNotificationRead(supabase, userId, id);
      if (request === version.current) setItems(current => filter === "unread"
        ? current.filter(item => item.id !== id)
        : current.map(item => item.id === id ? { ...item, status: "read" } : item));
    } catch {
      if (request === version.current) setActionError("Read status could not be saved. Please try again.");
    } finally {
      if (request === version.current) { busy.current = false; setWorking(false); }
    }
  }

  async function markLoadedRead() {
    if (busy.current) return;
    busy.current = true; setWorking(true); setActionError(""); setMessage("");
    const request = ++version.current;
    try {
      const result = await markLoadedNotificationsRead(supabase, userId, items);
      if (request !== version.current) return;
      setItems(current => filter === "unread"
        ? current.filter(item => !result.confirmed.includes(item.id))
        : current.map(item => result.confirmed.includes(item.id) ? {...item,status:"read"} : item));
      setMessage(result.confirmed.length + " loaded notification" + (result.confirmed.length === 1 ? "" : "s") + " marked as read.");
      if (result.unconfirmed.length) setActionError("Some read statuses could not be confirmed. Refresh Notifications to check their current status.");
    } catch {
      if (request === version.current) setActionError("Read statuses could not be confirmed. Refresh Notifications before trying again.");
    } finally {
      if (request === version.current) { busy.current = false; setWorking(false); }
    }
  }

  const disabled = loading || loadingMore || working;
  return <div>
    <div className="notification-toolbar">
      <button type="button" className="secondary-button" disabled={disabled}
        onClick={() => { if (!busy.current) void load(); }}>Refresh Notifications</button>
      <button type="button" className="text-button" disabled={disabled || !items.some(item => item.status === "unread")} onClick={() => void markLoadedRead()}>Mark Loaded Notifications Read</button>
      {!loading && <div className="notification-counts" aria-label="Loaded notification counts"><span className="pill">{items.filter(item => item.status === "unread").length} Unread</span><span className="pill">{items.length} Loaded</span></div>}
    </div>
    <p className="muted">Mark Loaded Notifications Read applies only to unread notifications currently loaded here. Older notifications keep their status.</p>
    {message && <p role="status">{message}</p>}
    {actionError && <div className="form-message" role="alert">{actionError}</div>}
    {error && <p role="alert">{error}</p>}
    {loading && <p role="status">Loading notifications...</p>}
    <>
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
      {!loading && !items.length && !error && <p className="muted">{filter === "unread"
        ? next ? "No unread alerts remain in this page. Load older notifications to continue." : "You're caught up. No unread notifications."
        : "Adventure Club milestones and family alerts will appear here."}</p>}
      {next && <button type="button" className="secondary-button" disabled={disabled}
        onClick={() => { if (!busy.current) void load(next); }}>{loadingMore ? "Loading Older Notifications..." : "Load Older Notifications"}</button>}
      {loadingMore && <p role="status">Loading older notifications...</p>}
      {!loading && items.length > 0 && !next && !error && <p className="muted">You have reached the end of your notifications.</p>}
    </>
  </div>;
}
