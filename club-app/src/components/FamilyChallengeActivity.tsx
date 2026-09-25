import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { saveFamilyParticipation, participationStatusLabel as statusLabel, type ParticipantResult } from "../lib/familyParticipation";
import { FamilySaveResults } from "./FamilySaveResults";
import { FamilyParticipants, type FamilyChild } from "./FamilyParticipants";

import { readFamilyChallenge, currentFamilySelection, type FamilyChallenge as Challenge, type FamilyChallengeStep as Step } from "../lib/familyChallengeState";
export function FamilyChallengeActivity({ householdId, children, challengeId, onSaved, onBusyChange, suspended = false }: {
  householdId: string; children: FamilyChild[]; challengeId: string; onSaved?: () => Promise<void>; onBusyChange?: (busy:boolean)=>void; suspended?: boolean;
}) {
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [checked, setChecked] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<Record<string,string>>({});
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [working, setWorking] = useState(false);
  const [results, setResults] = useState<ParticipantResult[]>([]);
  const [message, setMessage] = useState("");
  const [loadMessage, setLoadMessage] = useState("");
  const childKey = JSON.stringify(children.map(child => child.id).sort());
  const validSelected = currentFamilySelection(selected, children.map(child => child.id));
  const [reload, setReload] = useState(0);
  const busy = useRef(false);
  useEffect(() => {
    let stale = false;
    setLoading(true); setFailed(false); setLoadMessage("");
    if (suspended) return;
    async function load() {
      try {
        const data = await readFamilyChallenge(supabase, challengeId, JSON.parse(childKey));
        if (!stale) { setChallenge(data.challenge); setSteps(data.steps); setStatuses(Object.fromEntries(data.progress.map(row => [row.child_profile_id, statusLabel(row.status)]))); }

      } catch { if (!stale) { setFailed(true); setLoadMessage("Family challenge progress could not be loaded. Refresh Progress to try again."); } }
      finally { if (!stale) setLoading(false); }
    }
    void load(); return () => { stale = true; };
  }, [householdId,challengeId,reload,childKey,suspended]);
  useEffect(() => { setSelected(current => currentFamilySelection(current, JSON.parse(childKey))); setChecked([]); }, [childKey]);
  useEffect(() => {
    const refresh = () => { if (busy.current) return; setLoading(true); setChecked([]); setReload(value => value + 1); };
    window.addEventListener("dc-progress-updated", refresh);
    return () => window.removeEventListener("dc-progress-updated", refresh);
  }, []);
  async function save(action: "participate" | "complete") {
    if (busy.current || loading || failed || suspended || !validSelected.length) return;
    busy.current=true; setWorking(true); onBusyChange?.(true); setMessage(""); setResults([]);
    try {
      const results = await saveFamilyParticipation(supabase,householdId,challengeId,validSelected,"challenge",action,checked);
      setResults(results);
      setStatuses(current=>({...current,...Object.fromEntries(results.map(row=>[row.child_profile_id,statusLabel(row.status)]))}));
      setMessage(results.some(row=>row.status==="pending_parent") ? "Saved for the selected children. Challenges awaiting approval need guardian PIN approval before XP is awarded." : action === "participate" ? "Participation saved for each selected child. Completion XP is awarded when the challenge is completed." : "Completion confirmed for each selected child. Existing completion credit is kept without duplication.");
      window.dispatchEvent(new Event("dc-progress-updated"));
      if (onSaved) await onSaved().catch(()=>{});
    } catch { setMessage("We could not confirm every child's save. Refresh progress before retrying. Each selected child must have access and complete the required steps.");  }
    finally { setLoading(true); busy.current=false; setWorking(false); onBusyChange?.(false); setChecked([]); setReload(v=>v+1); }
  }
  if (loading && !challenge) return <p role="status">Loading family challenge...</p>;
  if (!challenge) return <div><p role="alert">{loadMessage}</p><button className="secondary-button" onClick={()=>setReload(v=>v+1)}>Retry Challenge</button></div>;
  return <section className="family-challenge-activity">
    <div className="section-heading"><div><p className="eyebrow gold">Together As A Family</p><h3>{challenge.title}</h3></div><span className="xp-chip">{challenge.xp_reward} XP Per Completion</span></div>
    <p className="muted">{challenge.description}</p>
    {loading && <p role="status">Refreshing family challenge progress...</p>}
    {failed && <p role="alert">{loadMessage}</p>}
    <FamilyParticipants children={children} selected={validSelected} onChange={ids=>{setSelected(ids);setChecked([]);setResults([]);setMessage("");}} disabled={working || loading || failed || suspended} statuses={statuses}/>
    {!!steps.length && <fieldset className="family-participants" disabled={working || loading || failed || suspended}><legend>Shared Challenge Steps</legend><p>Confirm each step was completed by every child you selected.</p>
      {steps.map(step=><label className="family-step-choice" key={step.id}><input type="checkbox" checked={checked.includes(step.id)} onChange={e=>setChecked(e.target.checked?[...checked,step.id]:checked.filter(id=>id!==step.id))}/><span><strong>{step.title}{step.is_required?" (Required)":""}</strong>{step.instructions&&<small>{step.instructions}</small>}</span></label>)}
    </fieldset>}
    {challenge.parent_approval_required&&<p className="guardian-note">Completion goes to guardian approval for each child before XP is awarded.</p>}
    {message&&<p className="form-message" role="status">{message}</p>}
    <FamilySaveResults results={results} children={children}/>
    <div className="family-action-buttons"><button className="secondary-button" disabled={working||loading||failed||suspended||!validSelected.length} onClick={()=>void save("participate")}>Save Participation</button><button className="primary-button" disabled={working||loading||failed||suspended||!validSelected.length||steps.some(step=>step.is_required&&!checked.includes(step.id))} onClick={()=>void save("complete")}>{working?"Saving...":"Complete For Selected Children"}</button><button className="text-button" disabled={working || loading || suspended} onClick={()=>{setLoading(true);setChecked([]);setReload(v=>v+1);}}>Refresh Progress</button></div>
  </section>;
}
export function FamilyChallenges({ householdId, children }: { householdId:string; children:FamilyChild[] }) {
  const [items,setItems]=useState<{id:string;title:string}[]>([]);
  const [working,setWorking]=useState(false);
  const [id,setId]=useState(""); const [loading,setLoading]=useState(true); const [error,setError]=useState(false); const [retry,setRetry]=useState(0);
  useEffect(()=>{let stale=false;setLoading(true);setError(false);void (async()=>{
    try { const r=await supabase.from("challenges").select("id,title").eq("challenge_type","family").eq("status","published").order("title");if(r.error)throw r.error;if(!stale){setItems(r.data??[]);setId(current=>current || r.data?.[0]?.id || "");}}
    catch {if(!stale)setError(true);}finally {if(!stale)setLoading(false);}
  })();return ()=>{stale=true;};},[householdId,retry]);
  const active = items.find(item => item.id === id);
  return <section className="family-section-card">
    <div className="section-heading"><h2>Family Challenges &amp; Projects</h2><button type="button" className="text-button" disabled={working || loading} onClick={() => setRetry(value => value + 1)}>Refresh Challenges</button></div>
    {loading && <p role="status">Loading family challenges...</p>}
    {error && <p role="alert">Family challenges could not be loaded. Use Refresh Challenges to try again.</p>}
    {!loading && !error && !items.length && <p className="muted">Published family challenges and projects will appear here. You can record Family Faith time below.</p>}
    {!!items.length && <label>Family Activity<select disabled={working || loading || error} value={active ? id : ""} onChange={event => setId(event.target.value)}>
      <option value="" disabled>Choose A Family Activity</option>{items.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}
    </select></label>}
    {!loading && !error && id && !active && <p role="status">The selected activity is no longer available. Choose another family activity to continue.</p>}
    {active && <FamilyChallengeActivity key={id} householdId={householdId} children={children} challengeId={id} onBusyChange={setWorking} suspended={loading || error}/>}
  </section>;
}
