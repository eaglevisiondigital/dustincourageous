import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { saveFamilyParticipation, type ParticipantResult } from "../lib/familyParticipation";
import { FamilySaveResults } from "./FamilySaveResults";
import { FamilyParticipants } from "./FamilyParticipants";

type Guide = {
  id: string;
  title: string;
  description: string | null;
  discussion_prompt: string | null;
  prayer_prompt: string | null;
  family_action: string | null;
  book_id: string | null;
  scripture_passages:
    | { reference: string; translation: string; verse_text: string }
    | { reference: string; translation: string; verse_text: string }[]
    | null;
};

type Session = {
  family_faith_guide_id: string;
  child_profile_id: string | null;
  completed_at: string;
};

type Child = {
  id: string;
  display_name: string;
};

function firstRelation<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

export function FamilyFaithAtHome({
  householdId,
  children
}: {
  householdId: string;
  children: Child[];
}) {
  const [guides, setGuides] = useState<Guide[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeGuideId, setActiveGuideId] = useState("");
  const [participants, setParticipants] = useState<string[]>([]);
  const [results, setResults] = useState<ParticipantResult[]>([]);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");
  const [loading,setLoading]=useState(true);
  const [loadError,setLoadError]=useState("");
  const loadVersion=useRef(0);
  const actionBusy=useRef(false);

  const load = useCallback(async () => {
    const version=++loadVersion.current;
    setLoading(true);setLoadError("");
    try {
    const [guideResult, sessionResult] = await Promise.all([
      supabase
        .from("family_faith_guides")
        .select("id,title,description,discussion_prompt,prayer_prompt,family_action,book_id,scripture_passages(reference,translation,verse_text)")
        .eq("status","published")
        .order("sort_order",{ascending:true})
        .order("created_at",{ascending:true}),
      supabase
        .from("household_faith_sessions")
        .select("family_faith_guide_id,child_profile_id,completed_at")
        .eq("household_id",householdId)
        .order("completed_at",{ascending:false})
    ]);

    const error=guideResult.error||sessionResult.error;
    if(version!==loadVersion.current)return;
    if(error)throw error;

    const nextGuides=(guideResult.data??[]) as Guide[];
    setGuides(nextGuides);
    setSessions((sessionResult.data??[]) as Session[]);
    setActiveGuideId(current=>current||nextGuides[0]?.id||"");
    } catch {
      if(version===loadVersion.current)setLoadError("Family Faith guides and progress could not be loaded. Please try again.");
    } finally {
      if(version===loadVersion.current)setLoading(false);
    }
  },[householdId]);

  useEffect(()=>{
    void load();
    const refresh=()=>{if(!actionBusy.current)void load();};
    window.addEventListener("dc-progress-updated",refresh);
    return ()=>{loadVersion.current+=1;window.removeEventListener("dc-progress-updated",refresh);};
  },[load]);


  const activeGuide=useMemo(
    ()=>guides.find((guide)=>guide.id===activeGuideId)??null,
    [guides,activeGuideId]
  );

  const completedIds = new Set(sessions.filter(session=>session.family_faith_guide_id===activeGuide?.id && session.child_profile_id).map(session=>session.child_profile_id!));
  const allSelectedComplete = participants.length > 0 && participants.every(id=>completedIds.has(id));

  async function completeGuide(){
    if(!activeGuide||actionBusy.current||loading||loadError||allSelectedComplete||!participants.length) return;
    if(participants.some(id=>!children.some(child=>child.id===id)))return;
    actionBusy.current=true;
    setWorking(true);
    setMessage("");
    setResults([]);

    try {
    const confirmed = await saveFamilyParticipation(supabase,householdId,activeGuide.id,participants,"faith");
    setResults(confirmed);
    setMessage("Family Faith completion saved to each selected child’s activity. Previously saved credit is kept without duplication.");
    window.dispatchEvent(new Event("dc-progress-updated"));
    } catch {
      setMessage("Completion could not be confirmed. Check the refreshed progress before trying again.");
    } finally {
      await load();actionBusy.current=false;setWorking(false);
    }
  }

  if(!guides.length&&(loading||loadError))return <section className="family-faith-card"><h2>Faith At Home</h2>{message&&<p role="status">{message}</p>}<FamilySaveResults results={results} children={children}/>{loading?<p role="status">Loading guides and progress...</p>:<><p role="alert">{loadError}</p><button type="button" className="secondary-button" onClick={()=>void load()}>Retry Family Faith</button></>}</section>;

  if(!guides.length){
    return (
      <section className="family-faith-card">
        <p className="eyebrow gold">Faith At Home</p>
        <h2>No guides are available right now.</h2>
        {message&&<p role="status">{message}</p>}
        <FamilySaveResults results={results} children={children}/>
        <button type="button" className="secondary-button" disabled={working} onClick={()=>void load()}>Refresh Family Faith</button>
      </section>
    );
  }

  return (
    <section className="family-faith-card">
      <div className="section-heading">
        <div>
          <p className="eyebrow gold">Faith At Home</p>
          <h2>Talk it through together</h2>
        </div>
        <span className="pill">{new Set(sessions.map(session=>session.family_faith_guide_id)).size} Guides Completed</span>
      </div>

      {message && <div className="form-message" role="status">{message}</div>}
      <FamilySaveResults results={results} children={children}/>
      {loading&&<p role="status">Refreshing guides and progress...</p>}
      {loadError&&<p role="alert">{loadError} Previously displayed progress may be out of date.</p>}
      <button type="button" className="text-button" disabled={loading||working} onClick={()=>void load()}>Refresh Family Faith</button>
      {!activeGuide&&<p role="status">The previously selected guide is no longer available. Choose another guide to continue.</p>}

      <div className="family-faith-selector">
        <label>
          Guide
          <select disabled={working||loading||Boolean(loadError)} value={activeGuide?.id??""} onChange={(event)=>{setActiveGuideId(event.target.value);setParticipants([]);setResults([]);setMessage("");}}>
            <option value="" disabled>Choose A Guide</option>
            {guides.map((guide)=><option key={guide.id} value={guide.id}>{guide.title}</option>)}
          </select>
        </label>
      </div>

      <FamilyParticipants children={children} selected={participants} onChange={ids=>{setParticipants(ids);setResults([]);setMessage("");}} disabled={working||loading||Boolean(loadError)||!activeGuide}
        statuses={Object.fromEntries([...completedIds].map(id=>[id,"Completed"]))}/>
      <p className="muted">Family Faith time appears in each participating child’s activity and eligible badge progress. It does not award challenge XP.</p>

      {activeGuide && (() => {
        const scripture=firstRelation(activeGuide.scripture_passages);
        return (
          <div className="family-faith-guide">
            <div className="family-faith-intro">
              <h3>{activeGuide.title}</h3>
              <p>{activeGuide.description}</p>
            </div>

            {scripture && (
              <article className="family-faith-block scripture">
                <span>Read Together</span>
                <strong>{scripture.reference} · {scripture.translation}</strong>
                <p>{scripture.verse_text}</p>
              </article>
            )}

            {activeGuide.discussion_prompt && (
              <article className="family-faith-block">
                <span>Talk About It</span>
                <p>{activeGuide.discussion_prompt}</p>
              </article>
            )}

            {activeGuide.prayer_prompt && (
              <article className="family-faith-block">
                <span>Pray Together</span>
                <p>{activeGuide.prayer_prompt}</p>
              </article>
            )}

            {activeGuide.family_action && (
              <article className="family-faith-block">
                <span>Do It Together</span>
                <p>{activeGuide.family_action}</p>
              </article>
            )}

            <button
              type="button"
              className={allSelectedComplete ? "secondary-button" : "primary-button"}
              disabled={allSelectedComplete||working||loading||Boolean(loadError)||!participants.length}
              onClick={()=>void completeGuide()}
            >
              {allSelectedComplete ? "Selected Children Completed ✓" : working ? "Saving..." : "Complete For Selected Children"}
            </button>
          </div>
        );
      })()}
    </section>
  );
}
