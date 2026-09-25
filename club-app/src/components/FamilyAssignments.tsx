import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { loadFamilyAssignments, loadHouseholdAssignments, type FamilyAssignment } from "../lib/familyAssignments";
import { FamilyChallengeActivity } from "./FamilyChallengeActivity";
import type { FamilyChild } from "./FamilyParticipants";

export function FamilyAssignments({ householdId, children }: { householdId: string; children: FamilyChild[] }) {
  const [items, setItems] = useState<FamilyAssignment[]>([]);
  const [activeId, setActiveId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [working, setWorking] = useState(false);
  const childKey = JSON.stringify(children.map(child => child.id).sort());
  useEffect(() => {
    let stale = false;
    setLoading(true); setError(false);
    void Promise.all([loadHouseholdAssignments(supabase, householdId, JSON.parse(childKey)), loadFamilyAssignments(supabase, JSON.parse(childKey))]).then(([direct, groups]) => {
      const rows = [...direct, ...groups];
      if (stale) return;
      setItems(rows);
      setActiveId(id => rows.some(row => row.id === id && row.challenge) ? id : "");
    }).catch(() => { if (!stale) setError(true); }).finally(() => { if (!stale) setLoading(false); });
    return () => { stale = true; };
  }, [householdId, childKey, retry]);
  const active = items.find(item => item.id === activeId);
  const names = (ids: string[]) => children.filter(child => ids.includes(child.id)).map(child => child.display_name).join(", ");
  return <section className="family-section-card">
    <div className="section-heading"><div><p className="eyebrow gold">Learn Together</p><h2>Family Assignments</h2></div>
      <button type="button" className="text-button" disabled={working || loading} onClick={() => setRetry(value => value + 1)}>Refresh Assignments</button>
    </div>
    <p className="muted">Household, child and active-group assignments, together in one place. Open an activity, then choose who took part.</p>
    {loading ? <p role="status">Loading family assignments...</p> : error ? <p role="alert">Family assignments could not be loaded. Use Refresh Assignments to try again.</p> : !items.length ? <p className="muted">No assignments are available for your active child profiles yet. Family challenges and Faith At Home are available below when published.</p> : <>
      <label>Choose Assignment<select value={activeId} disabled={working} onChange={event => setActiveId(event.target.value)}>
        <option value="">Choose An Assignment</option>
        {!!items.filter(item => !item.groupId).length && <optgroup label="Household & Child Assignments">{items.filter(item => !item.groupId).map(item => <option key={item.id} value={item.id} disabled={!item.challenge}>{item.groupName} · {item.challenge?.title ?? "Challenge Unavailable"}{item.groupName === "Child Assignment" ? " · " + names(item.childIds) : ""}</option>)}</optgroup>}
        {!!items.filter(item => item.groupId).length && <optgroup label="Group Assignments">{items.filter(item => item.groupId).map(item => <option key={item.id} value={item.id} disabled={!item.challenge}>{item.groupName} · {item.challenge?.title ?? "Challenge Unavailable"}</option>)}</optgroup>}
      </select></label>
      {items.some(item => !item.challenge) && <p className="muted">Some assigned challenges are currently unavailable. Refresh later to check access.</p>}
      {(items.filter(item => item.groupId).length === 100 || items.filter(item => !item.groupId).length === 100) && <p className="muted">Showing up to 100 recent household/child assignments and 100 recent group assignments.</p>}
      {active?.challenge && <>
        <div className="family-assignment-context"><strong>{active.groupName}</strong><p>Assigned To: {names(active.childIds)}</p>
          {active.dueAt && Number.isFinite(Date.parse(active.dueAt)) && <p>Due: <time dateTime={active.dueAt}>{new Date(active.dueAt).toLocaleString()}</time></p>}
          <p>Other children in your family may participate if they have access to the challenge. {active.groupId ? "Completing it does not join them to the group." : "Only children you check receive participation or completion credit."}</p>
        </div>
        <FamilyChallengeActivity key={active.id} householdId={householdId} children={children} challengeId={active.challenge.id} onBusyChange={setWorking}/>
      </>}
    </>}
  </section>;
}
