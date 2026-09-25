import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { readFamilyActivityPage, readOpenFamilyChallenges, type OpenFamilyChallenge, type FamilyActivity, type ActivityCursor } from "../lib/familyActivityHistory";
import type { FamilyChild } from "./FamilyParticipants";

export function FamilyActivityHistory({ householdId, children }: { householdId: string; children: FamilyChild[] }) {
  const [filter, setFilter] = useState("");
  const childKey = JSON.stringify(children.map(child => child.id).sort());
  const selected = children.some(child => child.id === filter) ? filter : "";
  return <section className="family-section-card">
    <div className="section-heading"><div><p className="eyebrow gold">Saved Progress</p><h2>Family Activity History</h2></div></div>
    <p className="muted">See current challenge participation and recorded activity for your active child profiles. Participation and pending approval do not award completion XP.</p>
    <label>Show Activity<select value={selected} onChange={event => setFilter(event.target.value)}><option value="">All Children</option>{children.map(child => <option key={child.id} value={child.id}>{child.display_name}</option>)}</select></label>
    <OpenChallenges key={"open:" + householdId + childKey + selected} householdId={householdId} children={children} childKey={selected ? JSON.stringify([selected]) : childKey}/>
    <h3>Recorded Activity</h3>
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

function OpenChallenges({ householdId, children, childKey }: { householdId: string; children: FamilyChild[]; childKey: string }) {
  const [items, setItems] = useState<OpenFamilyChallenge[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    let stale = false;
    setLoading(true); setError(false);
    void readOpenFamilyChallenges(supabase, householdId, JSON.parse(childKey)).then(page => {
      if (stale) return;
      setItems(page.items); setHasMore(page.hasMore);
    }).catch(() => { if (!stale) setError(true); }).finally(() => { if (!stale) setLoading(false); });
    return () => { stale = true; };
  }, [householdId, childKey, refresh]);
  useEffect(() => {
    const update = () => setRefresh(value => value + 1);
    window.addEventListener("dc-progress-updated", update);
    return () => window.removeEventListener("dc-progress-updated", update);
  }, []);
  return <div className="family-activity-history" aria-busy={loading}>
    <div className="section-heading"><h3>In Progress & Awaiting Approval</h3>
      <button type="button" className="text-button" disabled={loading} onClick={() => setRefresh(value => value + 1)}>Refresh Participation</button>
    </div>
    <p className="muted">Current challenge status, including saved participation. Review pending completions in Guardian Approvals above.</p>
    {loading && <p role="status">Refreshing participation...</p>}
    {error && <p role="alert">Participation could not be refreshed. Previously displayed statuses may be out of date. Use Refresh Participation to retry.</p>}
    {!loading && !error && !items.length && <p className="muted">No challenges in progress or awaiting approval for this selection.</p>}
    <ul>{items.map(item => <li key={item.id}>
      <div className="family-activity-heading"><strong>{children.find(child => child.id === item.childId)?.display_name ?? "Child Profile"}</strong>
        <span className="status-chip">{item.status === "pending_parent" ? "Awaiting Approval" : "In Progress"}</span>
      </div>
      <h4>{item.title}</h4><p>Updated <time dateTime={item.updatedAt}>{new Date(item.updatedAt).toLocaleString()}</time></p>
    </li>)}</ul>
    {hasMore && <p className="muted">Showing the 50 most recently updated open challenges. Choose a child above to narrow the list.</p>}
  </div>;
}
