import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

type Standard = {
  id: string;
  standard_key: string;
  title: string;
  version: string;
  authority_scope: string;
  description: string;
  is_locked: boolean;
};

type Rule = {
  id: string;
  rule_key: string;
  category: string;
  title: string;
  rule_text: string;
  severity: string;
  sort_order: number;
  dc_governance_standards:
    | { title: string; version: string; authority_scope: string }
    | { title: string; version: string; authority_scope: string }[]
    | null;
};

type BrandAsset = {
  id: string;
  asset_key: string;
  asset_type: string;
  title: string;
  source_url: string | null;
  approval_status: string;
  approved_version: string | null;
  usage_notes: string | null;
};

type Character = {
  id: string;
  character_key: string;
  display_name: string;
  visual_age: number | null;
  role: string | null;
  locked_traits: Record<string, unknown>;
  prohibited_traits: Record<string, unknown>;
  status: string;
};

type EntityStatus = {
  entity_type: string;
  entity_id: string;
  title: string;
  entity_status: string;
  entity_updated_at: string;
  review_id: string | null;
  review_status: string | null;
  reviewed_at: string | null;
  approval_current: boolean | null;
};

type Review = {
  id: string;
  entity_type: string;
  entity_id: string;
  status: string;
  notes: string | null;
  reviewed_at: string | null;
  creative_alignment: boolean | null;
  word_of_faith_alignment: boolean | null;
  scripture_verified: boolean | null;
  identity_in_christ_alignment: boolean | null;
  child_age_appropriate: boolean | null;
  church_affirming: boolean | null;
  approved_assets_only: boolean | null;
  character_continuity: boolean | null;
  language_style_pass: boolean | null;
};

const checks = [
  ["creative_alignment","DC Bible creative alignment"],
  ["word_of_faith_alignment","Word of Faith alignment"],
  ["scripture_verified","Scripture verified"],
  ["identity_in_christ_alignment","Identity in Christ alignment"],
  ["child_age_appropriate","Child age appropriate"],
  ["church_affirming","Local church affirming"],
  ["approved_assets_only","Approved DC assets only"],
  ["character_continuity","Character continuity"],
  ["language_style_pass","Language/style pass"]
] as const;

function firstRelation<T>(value:T|T[]|null):T|null {
  return Array.isArray(value)?value[0]??null:value;
}

export function GovernanceAdmin() {
  const [standards,setStandards]=useState<Standard[]>([]);
  const [rules,setRules]=useState<Rule[]>([]);
  const [assets,setAssets]=useState<BrandAsset[]>([]);
  const [characters,setCharacters]=useState<Character[]>([]);
  const [entities,setEntities]=useState<EntityStatus[]>([]);
  const [reviews,setReviews]=useState<Review[]>([]);
  const [selectedEntityKey,setSelectedEntityKey]=useState("");
  const [notes,setNotes]=useState("");
  const [reviewNotes,setReviewNotes]=useState("");
  const [checkState,setCheckState]=useState<Record<string,boolean>>(
    Object.fromEntries(checks.map(([key])=>[key,false]))
  );
  const [working,setWorking]=useState(false);
  const [message,setMessage]=useState("");

  const load=useCallback(async()=>{
    setMessage("");

    const [standardResult,ruleResult,assetResult,characterResult,entityResult,reviewResult]=await Promise.all([
      supabase
        .from("dc_governance_standards")
        .select("id,standard_key,title,version,authority_scope,description,is_locked")
        .eq("is_active",true)
        .order("authority_scope"),
      supabase
        .from("dc_governance_rules")
        .select("id,rule_key,category,title,rule_text,severity,sort_order,dc_governance_standards(title,version,authority_scope)")
        .eq("is_active",true)
        .order("sort_order"),
      supabase
        .from("dc_brand_assets")
        .select("id,asset_key,asset_type,title,source_url,approval_status,approved_version,usage_notes")
        .order("asset_type"),
      supabase
        .from("dc_character_profiles")
        .select("id,character_key,display_name,visual_age,role,locked_traits,prohibited_traits,status")
        .order("display_name"),
      supabase
        .from("dc_governance_review_status")
        .select("*")
        .order("entity_type")
        .order("title"),
      supabase
        .from("dc_content_reviews")
        .select("id,entity_type,entity_id,status,notes,reviewed_at,creative_alignment,word_of_faith_alignment,scripture_verified,identity_in_christ_alignment,child_age_appropriate,church_affirming,approved_assets_only,character_continuity,language_style_pass")
        .in("status",["pending","changes_requested","approved"])
        .order("created_at",{ascending:false})
    ]);

    const error =
      standardResult.error||
      ruleResult.error||
      assetResult.error||
      characterResult.error||
      entityResult.error||
      reviewResult.error;

    if(error){
      setMessage(error.message);
      return;
    }

    const nextEntities=(entityResult.data??[]) as EntityStatus[];

    setStandards((standardResult.data??[]) as Standard[]);
    setRules((ruleResult.data??[]) as Rule[]);
    setAssets((assetResult.data??[]) as BrandAsset[]);
    setCharacters((characterResult.data??[]) as Character[]);
    setEntities(nextEntities);
    setReviews((reviewResult.data??[]) as Review[]);

    if(!selectedEntityKey&&nextEntities[0]){
      setSelectedEntityKey(nextEntities[0].entity_type+":"+nextEntities[0].entity_id);
    }
  },[selectedEntityKey]);

  useEffect(()=>{void load();},[load]);

  const selectedEntity=useMemo(
    ()=>entities.find((item)=>item.entity_type+":"+item.entity_id===selectedEntityKey)??null,
    [entities,selectedEntityKey]
  );

  const selectedReview=useMemo(
    ()=>selectedEntity
      ? reviews.find((review)=>review.entity_type===selectedEntity.entity_type&&review.entity_id===selectedEntity.entity_id&&["pending","changes_requested","approved"].includes(review.status))??null
      : null,
    [reviews,selectedEntity]
  );

  useEffect(()=>{
    if(selectedReview){
      setReviewNotes(selectedReview.notes??"");
      setCheckState(Object.fromEntries(checks.map(([key])=>[key,Boolean(selectedReview[key as keyof Review])])));
    }else{
      setReviewNotes("");
      setCheckState(Object.fromEntries(checks.map(([key])=>[key,false])));
    }
  },[selectedReview?.id]);

  async function requestReview(){
    if(!selectedEntity)return;
    setWorking(true);setMessage("");

    const {error}=await supabase.rpc("request_dc_content_review",{
      p_entity_type:selectedEntity.entity_type,
      p_entity_id:selectedEntity.entity_id,
      p_notes:notes.trim()||undefined
    });

    setWorking(false);
    if(error){setMessage(error.message);return;}
    setNotes("");
    setMessage("DC governance review requested.");
    await load();
  }

  async function approveReview(){
    if(!selectedReview)return;
    setWorking(true);setMessage("");

    const {error}=await supabase.rpc("approve_dc_content_review",{
      p_review_id:selectedReview.id,
      p_creative_alignment:Boolean(checkState.creative_alignment),
      p_word_of_faith_alignment:Boolean(checkState.word_of_faith_alignment),
      p_scripture_verified:Boolean(checkState.scripture_verified),
      p_identity_in_christ_alignment:Boolean(checkState.identity_in_christ_alignment),
      p_child_age_appropriate:Boolean(checkState.child_age_appropriate),
      p_church_affirming:Boolean(checkState.church_affirming),
      p_approved_assets_only:Boolean(checkState.approved_assets_only),
      p_character_continuity:Boolean(checkState.character_continuity),
      p_language_style_pass:Boolean(checkState.language_style_pass),
      p_notes:reviewNotes.trim()||undefined
    });

    setWorking(false);
    if(error){setMessage(error.message);return;}
    setMessage(Object.values(checkState).every(Boolean)?"Review approved.":"Changes requested because one or more required checks did not pass.");
    await load();
  }

  async function publishEntity(){
    if(!selectedEntity)return;
    setWorking(true);setMessage("");

    let targetStatus="published";
    if(selectedEntity.entity_type==="book"&&selectedEntity.entity_status==="draft"){
      targetStatus="published";
    }

    const {error}=await supabase.rpc("publish_dc_entity",{
      p_entity_type:selectedEntity.entity_type,
      p_entity_id:selectedEntity.entity_id,
      p_target_status:targetStatus
    });

    setWorking(false);
    if(error){setMessage(error.message);return;}
    setMessage("Published through DC Governance.");
    await load();
  }

  function markAllPassed(){
    setCheckState(Object.fromEntries(checks.map(([key])=>[key,true])));
  }

  return (
    <div className="governance-admin">
      {message&&<div className="form-message">{message}</div>}

      <section className="governance-hero">
        <div>
          <p className="eyebrow gold">Founder’s Standards</p>
          <h2>DC Brand & Theology Governance</h2>
          <p>
            The Dustin Courageous Bible governs creative decisions. The Master Production Manual governs technical production only.
            Published Adventure Club content must also pass the locked Word of Faith, brand, child-safety, asset, and continuity checks.
          </p>
        </div>
        <div className="governance-lock">LOCKED</div>
      </section>

      <div className="governance-standard-grid">
        {standards.map((standard)=>(
          <article key={standard.id}>
            <span>{standard.authority_scope.replaceAll("_"," ")}</span>
            <h3>{standard.title}</h3>
            <small>v{standard.version}{standard.is_locked?" · locked":""}</small>
            <p>{standard.description}</p>
          </article>
        ))}
      </div>

      <div className="admin-two-column">
        <section className="admin-card">
          <div className="section-heading compact-heading">
            <div><p className="eyebrow red">Publishing Gate</p><h2>Review content</h2></div>
          </div>

          <label>
            Content item
            <select value={selectedEntityKey} onChange={(event)=>setSelectedEntityKey(event.target.value)}>
              {entities.map((entity)=>(
                <option key={entity.entity_type+":"+entity.entity_id} value={entity.entity_type+":"+entity.entity_id}>
                  {entity.entity_type.replaceAll("_"," ")} · {entity.title} · {entity.entity_status}
                </option>
              ))}
            </select>
          </label>

          {selectedEntity&&(
            <div className="governance-selected">
              <div>
                <span>Current status</span>
                <strong>{selectedEntity.entity_status}</strong>
              </div>
              <div>
                <span>Review</span>
                <strong>{selectedEntity.review_status??"not requested"}</strong>
              </div>
              <div>
                <span>Approval current</span>
                <strong>{selectedEntity.approval_current?"yes":"no"}</strong>
              </div>
            </div>
          )}

          {!selectedReview||selectedReview.status==="approved"?(
            <>
              <label>
                Review request note <span className="optional">(optional)</span>
                <textarea value={notes} onChange={(event)=>setNotes(event.target.value)} placeholder="What changed or what should the reviewer pay attention to?"/>
              </label>
              <button className="secondary-button" disabled={!selectedEntity||working} onClick={()=>void requestReview()}>
                Request new DC review
              </button>
            </>
          ):(
            <>
              <div className="governance-checklist">
                {checks.map(([key,label])=>(
                  <label className="governance-check" key={key}>
                    <input
                      type="checkbox"
                      checked={Boolean(checkState[key])}
                      onChange={(event)=>setCheckState((current)=>({...current,[key]:event.target.checked}))}
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>

              <button className="text-button small" type="button" onClick={markAllPassed}>
                Mark all checks passed / not applicable
              </button>

              <label>
                Reviewer notes
                <textarea value={reviewNotes} onChange={(event)=>setReviewNotes(event.target.value)}/>
              </label>

              <button className="primary-button" disabled={working} onClick={()=>void approveReview()}>
                Save DC governance review
              </button>
            </>
          )}

          {selectedEntity?.approval_current&&selectedEntity.entity_status==="draft"&&(
            <button className="primary-button governance-publish" disabled={working} onClick={()=>void publishEntity()}>
              Publish approved content
            </button>
          )}
        </section>

        <section className="admin-card">
          <div className="section-heading compact-heading">
            <div><p className="eyebrow gold">Locked Assets</p><h2>Brand assets & characters</h2></div>
          </div>

          <div className="governance-assets">
            {assets.map((asset)=>(
              <article key={asset.id}>
                <div>
                  <span>{asset.asset_type.replaceAll("_"," ")}</span>
                  <strong>{asset.title}</strong>
                  <small>{asset.approval_status}{asset.approved_version?" · v"+asset.approved_version:""}</small>
                </div>
                {asset.source_url&&<img src={asset.source_url} alt={asset.title}/>}
                {asset.usage_notes&&<p>{asset.usage_notes}</p>}
              </article>
            ))}
          </div>

          <div className="governance-characters">
            {characters.map((character)=>(
              <article key={character.id}>
                <span>{character.role}</span>
                <h3>{character.display_name}</h3>
                <small>Visual age: {character.visual_age??"locked by Bible"}</small>
                <p>{Object.entries(character.locked_traits).map(([key,value])=>key.replaceAll("_"," ")+": "+String(value)).join(" · ")}</p>
              </article>
            ))}
          </div>
        </section>
      </div>

      <section className="admin-card">
        <div className="section-heading compact-heading">
          <div><p className="eyebrow red">Required Rules</p><h2>DC Bible guardrails</h2></div>
          <span className="pill">{rules.length}</span>
        </div>

        <div className="governance-rule-list">
          {rules.map((rule)=>{
            const standard=firstRelation(rule.dc_governance_standards);
            return (
              <article key={rule.id}>
                <div>
                  <span>{rule.category.replaceAll("_"," ")} · {rule.severity.replaceAll("_"," ")}</span>
                  <h3>{rule.title}</h3>
                  <p>{rule.rule_text}</p>
                </div>
                <small>{standard?.title} · v{standard?.version}</small>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
