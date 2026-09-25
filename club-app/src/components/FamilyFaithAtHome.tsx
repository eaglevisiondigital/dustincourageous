import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { completeFamilyFaith } from "../lib/familyActions";

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
  user,
  children,
  selectedChildId
}: {
  householdId: string;
  user: User;
  children: Child[];
  selectedChildId: string;
}) {
  const [guides, setGuides] = useState<Guide[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeGuideId, setActiveGuideId] = useState("");
  const [activeChildId, setActiveChildId] = useState(selectedChildId);
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
    setActiveGuideId(current=>nextGuides.some(guide=>guide.id===current)?current:nextGuides[0]?.id??"");
    } catch {
      if(version===loadVersion.current)setLoadError("Family Faith guides and progress could not be loaded. Please try again.");
    } finally {
      if(version===loadVersion.current)setLoading(false);
    }
  },[householdId]);

  useEffect(()=>{ void load();return ()=>{loadVersion.current+=1;}; },[load]);

  useEffect(()=>{
    if(selectedChildId) setActiveChildId(selectedChildId);
  },[selectedChildId]);

  const activeGuide=useMemo(
    ()=>guides.find((guide)=>guide.id===activeGuideId)??guides[0]??null,
    [guides,activeGuideId]
  );

  const completedForChild = activeGuide
    ? sessions.find((session)=>session.family_faith_guide_id===activeGuide.id && session.child_profile_id===(activeChildId||null))
    : undefined;

  async function completeGuide(){
    if(!activeGuide||actionBusy.current||loading||loadError||completedForChild) return;
    if(activeChildId&&!children.some(child=>child.id===activeChildId))return;
    actionBusy.current=true;
    setWorking(true);
    setMessage("");

    try {
    await completeFamilyFaith(supabase,householdId,activeGuide.id,activeChildId||null,user.id);
    setMessage("Family Faith time completed.");
    window.dispatchEvent(new Event("dc-progress-updated"));
    } catch {
      setMessage("Completion could not be confirmed. Check the refreshed progress before trying again.");
    } finally {
      await load();actionBusy.current=false;setWorking(false);
    }
  }

  if(loading||loadError)return <section className="family-faith-card"><h2>Faith at Home</h2>{loading?<p role="status">Loading guides and progress...</p>:<><p role="alert">{loadError}</p><button type="button" className="secondary-button" onClick={()=>void load()}>Retry Family Faith</button></>}</section>;

  if(!guides.length){
    return (
      <section className="family-faith-card">
        <p className="eyebrow gold">Faith at Home</p>
        <h2>Family Faith guides are coming.</h2>
      </section>
    );
  }

  return (
    <section className="family-faith-card">
      <div className="section-heading">
        <div>
          <p className="eyebrow gold">Faith at Home</p>
          <h2>Talk it through together</h2>
        </div>
        <span className="pill">{sessions.length} completed</span>
      </div>

      {message && <div className="form-message" role="status">{message}</div>}

      <div className="family-faith-selector">
        <label>
          Guide
          <select disabled={working} value={activeGuideId} onChange={(event)=>setActiveGuideId(event.target.value)}>
            {guides.map((guide)=><option key={guide.id} value={guide.id}>{guide.title}</option>)}
          </select>
        </label>
        <label>
          Child
          <select disabled={working} value={activeChildId} onChange={(event)=>setActiveChildId(event.target.value)}>
            <option value="">Whole family</option>
            {children.map((child)=><option key={child.id} value={child.id}>{child.display_name}</option>)}
          </select>
        </label>
      </div>

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
              className={completedForChild ? "secondary-button" : "primary-button"}
              disabled={Boolean(completedForChild)||working}
              onClick={()=>void completeGuide()}
            >
              {completedForChild ? "Completed ✓" : working ? "Saving..." : "Complete Family Faith Time"}
            </button>
          </div>
        );
      })()}
    </section>
  );
}
