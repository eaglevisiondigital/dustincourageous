import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { readFamilyActivityPage, type FamilyActivity, type ActivityCursor } from "../lib/familyActivityHistory";
import type { FamilyChild } from "./FamilyParticipants";

export function FamilyActivityHistory({ householdId, children }: { householdId: string; children: FamilyChild[] }) {
  const [filter, setFilter] = useState("");
  const childKey = JSON.stringify(children.map(child => child.id).sort());
  const selected = children.some(child => child.id === filter) ? filter : "";
  return <section className="family-section-card">
    <div className="section-heading"><div><p className="eyebrow gold">Saved Progress</p><h2>Family Activity History</h2></div></div>
    <p className="muted">Recorded activity for your active child profiles. Pending approvals and participation that has not earned completion credit may not appear yet.</p>
    <label>Show Activity<select value={selected} onChange={event => setFilter(event.target.value)}><option value="">All Children</option>{children.map(child => <option key={child.id} value={child.id}>{child.display_name}</option>)}</select></label>
    <ActivityList key={householdId + childKey + selected} householdId={householdId} children={children} childKey={selected ? JSON.stringify([selected]) : childKey}/>
  </section>;
}
function ActivityList({ householdId, children, childKey }: { householdId: string; children: FamilyChild[]; childKey: string }) {
  const [items, setItems] = useState<FamilyActivity[]>([]);
  const [next, setNext] = useState<ActivityCursor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const version = useRef(0);
  const busy = useRef(false);
  const refreshPending = useRef(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const load = useCallback(async (cursor: ActivityCursor | null = null) => {
    if (busy.current) return;
    busy.current = true;
    const request = ++version.current;
    setLoading(true); setError("");
    try {
      const page = await readFamilyActivityPage(supabase, householdId, JSON.parse(childKey), cursor);
      if (request !== version.current) return;
      setItems(current => cursor ? [...current, ...page.items.filter(row => !current.some(old => old.id === row.id))] : page.items);
      setNext(page.next);
    } catch {
      if (request === version.current) setError("Activity could not be loaded. Your displayed history has been kept. Please retry.");
    } finally {
      if (request === version.current) {
        busy.current = false; setLoading(false);
        if (refreshPending.current) { refreshPending.current = false; setRefreshKey(value => value + 1); }
      }
    }
  }, [householdId, childKey]);
  useEffect(() => {
    void load();
    const refresh = () => { if (busy.current) refreshPending.current = true; else void load(); };
    window.addEventListener("dc-progress-updated", refresh);
    return () => { version.current++; busy.current = false; window.removeEventListener("dc-progress-updated", refresh); };
  }, [load, refreshKey]);
  return <div className="family-activity-history" aria-busy={loading}>
    <div className="family-action-buttons"><button type="button" className="secondary-button" disabled={loading} onClick={() => void load()}>Refresh History</button></div>
    {error && <p role="alert">{error}</p>}
    {!loading && !error && !items.length && <p className="muted">No recorded activity yet for this selection.</p>}
    <ul>{items.map(item => <li key={item.id}>
      <div className="family-activity-heading"><strong>{children.find(child => child.id === item.child_profile_id)?.display_name ?? "Child Profile"}</strong>
        {!!item.xp_delta && <span className="xp-chip">{item.xp_delta > 0 ? "+" : ""}{item.xp_delta} XP</span>}
      </div>
      <h3>{item.title}</h3>{item.description && <p>{item.description}</p>}
      <time dateTime={item.created_at}>{new Date(item.created_at).toLocaleString()}</time>
    </li>)}</ul>
    {loading && <p role="status">Loading activity...</p>}
    {next && <button type="button" className="secondary-button" disabled={loading} onClick={() => void load(next)}>{error ? "Retry Older Activity" : "Load Older Activity"}</button>}
  </div>;
}
