import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { markNotificationRead } from "../lib/familyActions";

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
  const [loading,setLoading]=useState(true);
  const [working,setWorking]=useState(false);
  const [actionError,setActionError]=useState("");
  const loadVersion=useRef(0);
  const actionBusy=useRef(false);

  const load = useCallback(async () => {
    const version=++loadVersion.current;
    setLoading(true);setError("");
    try {
    const { data, error: loadError } = await supabase
      .from("user_notifications")
      .select("id,title,body,status,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(12);

    if(version!==loadVersion.current)return;
    if(loadError)throw loadError;
    setItems((data ?? []) as Notification[]);
    } catch {
      if(version===loadVersion.current)setError("Notifications could not be loaded. Please try again.");
    } finally {
      if(version===loadVersion.current)setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void load();
    return ()=>{loadVersion.current+=1;};
  }, [load]);

  async function markRead(id: string) {
    if(actionBusy.current||loading)return;
    actionBusy.current=true;setWorking(true);setActionError("");
    try {
      await markNotificationRead(supabase,userId,id);
      setItems((current) =>
        current.map((item) => (item.id === id ? { ...item, status: "read" } : item))
      );
    } catch {
      setActionError("Read status could not be saved. Please try again.");
    } finally {
      actionBusy.current=false;setWorking(false);
    }
  }

  return (
    <section className="family-section-card">
      <div className="section-heading compact-heading">
        <div>
          <p className="eyebrow red">Family Activity</p>
          <h2>Notifications</h2>
        </div>
        {!loading&&!error&&<span className="pill">{items.filter((item) => item.status === "unread").length} unread in recent notifications</span>}
      </div>

      {actionError && <div className="form-message" role="alert">{actionError}</div>}

      {loading?<p role="status">Loading notifications...</p>:error?<div><p role="alert">{error}</p><button type="button" className="secondary-button" onClick={()=>void load()}>Retry notifications</button></div>:items.length ? (
        <div className="notification-list">
          {items.map((item) => (
            <button
              type="button"
              key={item.id}
              disabled={working||item.status!=="unread"}
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
