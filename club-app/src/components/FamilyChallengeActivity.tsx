import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { saveFamilyParticipation, participationStatusLabel as statusLabel, type ParticipantResult } from "../lib/familyParticipation";
import { FamilySaveResults } from "./FamilySaveResults";
import { FamilyParticipants, type FamilyChild } from "./FamilyParticipants";

type Challenge = { id: string; title: string; description: string | null; xp_reward: number; parent_approval_required: boolean };
type Step = { id: string; title: string; instructions: string | null; is_required: boolean };
export function FamilyChallengeActivity({ householdId, children, challengeId, onSaved, onBusyChange }: {
  householdId: string; children: FamilyChild[]; challengeId: string; onSaved?: () => Promise<void>; onBusyChange?: (busy:boolean)=>void;
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
  const [reload, setReload] = useState(0);
  const busy = useRef(false);
  useEffect(() => {
    let stale = false;
    setLoading(true); setFailed(false);
    async function load() {
      try {
        const [c,s,p] = await Promise.all([
          supabase.from("challenges").select("id,title,description,xp_reward,parent_approval_required").eq("id",challengeId).eq("status","published").single(),
          supabase.from("challenge_steps").select("id,title,instructions,is_required").eq("challenge_id",challengeId).order("sort_order"),
          supabase.from("child_challenge_progress").select("child_profile_id,status").eq("challenge_id",challengeId).in("child_profile_id",children.map(child=>child.id))
        ]);
        if (c.error || s.error || p.error || !c.data) throw new Error("Load failed");
        if (!stale) { setChallenge(c.data); setSteps(s.data ?? []); setStatuses(Object.fromEntries((p.data??[]).map(row=>[row.child_profile_id,statusLabel(row.status)]))); }
      } catch { if (!stale) { setFailed(true); setMessage("Family challenge progress could not be loaded. Please retry."); } }
      finally { if (!stale) setLoading(false); }
    }
    void load(); return () => { stale = true; };
  }, [householdId,challengeId,reload,children.map(child=>child.id).join(",")]);
  useEffect(() => {
    const refresh = () => { if (!busy.current) setChecked([]); setReload(value => value + 1); };
    window.addEventListener("dc-progress-updated", refresh);
    return () => window.removeEventListener("dc-progress-updated", refresh);
  }, []);
  async function save(action: "participate" | "complete") {
    if (busy.current || loading || failed || !selected.length) return;
    busy.current=true; setWorking(true); onBusyChange?.(true); setMessage(""); setResults([]);
    try {
      const results = await saveFamilyParticipation(supabase,householdId,challengeId,selected,"challenge",action,checked);
      setResults(results);
      setStatuses(current=>({...current,...Object.fromEntries(results.map(row=>[row.child_profile_id,statusLabel(row.status)]))}));
      setMessage(results.some(row=>row.status==="pending_parent") ? "Saved for the selected children. Challenges awaiting approval need guardian PIN approval before XP is awarded." : action === "participate" ? "Participation saved for each selected child. Completion XP is awarded when the challenge is completed." : "Completion confirmed for each selected child. Existing completion credit is kept without duplication.");
      window.dispatchEvent(new Event("dc-progress-updated"));
      if (onSaved) await onSaved().catch(()=>{});
    } catch { setMessage("We could not confirm every child's save. Refresh progress before retrying. Each selected child must have access and complete the required steps."); setReload(v=>v+1); }
    finally { busy.current=false; setWorking(false); onBusyChange?.(false); }
  }
  if (loading) return <p role="status">Loading family challenge...</p>;
  if (failed || !challenge) return <div><p role="alert">{message}</p><button className="secondary-button" onClick={()=>setReload(v=>v+1)}>Retry Challenge</button></div>;
  return <section className="family-challenge-activity">
    <div className="section-heading"><div><p className="eyebrow gold">Together As A Family</p><h3>{challenge.title}</h3></div><span className="xp-chip">{challenge.xp_reward} XP Per Completion</span></div>
    <p className="muted">{challenge.description}</p>
    <FamilyParticipants children={children} selected={selected} onChange={ids=>{setSelected(ids);setChecked([]);setResults([]);setMessage("");}} disabled={working} statuses={statuses}/>
    {!!steps.length && <fieldset className="family-participants" disabled={working}><legend>Shared Challenge Steps</legend><p>Confirm each step was completed by every child you selected.</p>
      {steps.map(step=><label className="family-step-choice" key={step.id}><input type="checkbox" checked={checked.includes(step.id)} onChange={e=>setChecked(e.target.checked?[...checked,step.id]:checked.filter(id=>id!==step.id))}/><span><strong>{step.title}{step.is_required?" (Required)":""}</strong>{step.instructions&&<small>{step.instructions}</small>}</span></label>)}
    </fieldset>}
    {challenge.parent_approval_required&&<p className="guardian-note">Completion goes to guardian approval for each child before XP is awarded.</p>}
    {message&&<p className="form-message" role="status">{message}</p>}
    <FamilySaveResults results={results} children={children}/>
    <div className="family-action-buttons"><button className="secondary-button" disabled={working||!selected.length} onClick={()=>void save("participate")}>Save Participation</button><button className="primary-button" disabled={working||!selected.length||steps.some(step=>step.is_required&&!checked.includes(step.id))} onClick={()=>void save("complete")}>{working?"Saving...":"Complete For Selected Children"}</button><button className="text-button" disabled={working} onClick={()=>setReload(v=>v+1)}>Refresh Progress</button></div>
  </section>;
}
export function FamilyChallenges({ householdId, children }: { householdId:string; children:FamilyChild[] }) {
  const [items,setItems]=useState<{id:string;title:string}[]>([]);
  const [working,setWorking]=useState(false);
  const [id,setId]=useState(""); const [loading,setLoading]=useState(true); const [error,setError]=useState(false); const [retry,setRetry]=useState(0);
  useEffect(()=>{let stale=false;setLoading(true);setError(false);void (async()=>{
    try { const r=await supabase.from("challenges").select("id,title").eq("challenge_type","family").eq("status","published").order("title");if(r.error)throw r.error;if(!stale){setItems(r.data??[]);setId(current=>(r.data??[]).some(c=>c.id===current)?current:r.data?.[0]?.id??"");}}
    catch {if(!stale)setError(true);}finally {if(!stale)setLoading(false);}
  })();return ()=>{stale=true;};},[householdId,retry]);
  return <section className="family-section-card"><h2>Family Challenges & Projects</h2>{loading?<p role="status">Loading family challenges...</p>:error?<div><p role="alert">Family challenges could not be loaded.</p><button className="secondary-button" onClick={()=>setRetry(v=>v+1)}>Retry Challenges</button></div>:!items.length?<p className="muted">Published family challenges and projects will appear here. You can record Family Faith time below.</p>:<><label>Family Activity<select disabled={working} value={id} onChange={e=>setId(e.target.value)}>{items.map(item=><option key={item.id} value={item.id}>{item.title}</option>)}</select></label>{id&&<FamilyChallengeActivity key={id} householdId={householdId} children={children} challengeId={id} onBusyChange={setWorking}/>}</>}</section>;
}
