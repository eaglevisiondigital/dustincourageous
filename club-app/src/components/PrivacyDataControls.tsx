import { familyControlLabel } from "../lib/familyDisplay";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import type { Database } from "../types/database";

type Child = {
  id: string;
  display_name: string;
  status: string;
};

type ConsentPolicy = {
  consent_key: string;
  title: string;
  description: string;
  current_policy_version: string;
  required_for_core_service: boolean;
  applies_to_child: boolean;
};

type Consent = {
  id: string;
  household_id: string;
  child_profile_id: string | null;
  consent_key: string;
  title: string;
  action: string;
  policy_version: string;
  created_at: string;
};

type PrivacyRequest = {
  id: string;
  child_profile_id: string | null;
  request_type: string;
  status: string;
  reason: string | null;
  export_reference: string | null;
  export_expires_at: string | null;
  created_at: string;
};

type Inventory = Database["public"]["Views"]["child_data_inventory"]["Row"];

export function PrivacyDataControls({
  householdId,
  user,
  onHouseholdUpdated
}: {
  householdId: string;
  user: User;
  onHouseholdUpdated: () => Promise<void>;
}) {
  const [children,setChildren]=useState<Child[]>([]);
  const [policies,setPolicies]=useState<ConsentPolicy[]>([]);
  const [consents,setConsents]=useState<Consent[]>([]);
  const [requests,setRequests]=useState<PrivacyRequest[]>([]);
  const [inventory,setInventory]=useState<Inventory[]>([]);
  const [selectedChildId,setSelectedChildId]=useState("");
  const [requestType,setRequestType]=useState("export_household");
  const [reason,setReason]=useState("");
  const [working,setWorking]=useState("");
  const [message,setMessage]=useState("");

  const load=useCallback(async()=>{
    setMessage("");
    const [childResult,policyResult,consentResult,requestResult,inventoryResult]=await Promise.all([
      supabase
        .from("child_profiles")
        .select("id,display_name,status")
        .eq("household_id",householdId)
        .order("created_at",{ascending:true}),
      supabase
        .from("consent_policies")
        .select("consent_key,title,description,current_policy_version,required_for_core_service,applies_to_child")
        .eq("is_active",true)
        .order("required_for_core_service",{ascending:false})
        .order("title"),
      supabase
        .from("current_household_consents")
        .select("id,household_id,child_profile_id,consent_key,title,action,policy_version,created_at")
        .eq("household_id",householdId),
      supabase
        .from("data_privacy_requests")
        .select("id,child_profile_id,request_type,status,reason,export_reference,export_expires_at,created_at")
        .eq("household_id",householdId)
        .order("created_at",{ascending:false})
        .limit(50),
      supabase
        .from("child_data_inventory")
        .select("*")
        .eq("household_id",householdId)
        .order("display_name")
    ]);

    const error=childResult.error||policyResult.error||consentResult.error||requestResult.error||inventoryResult.error;
    if(error){
      setMessage(error.message);
      return;
    }

    const nextChildren=(childResult.data??[]) as Child[];
    setChildren(nextChildren);
    setPolicies((policyResult.data??[]) as ConsentPolicy[]);
    setConsents((consentResult.data??[]) as Consent[]);
    setRequests((requestResult.data??[]) as PrivacyRequest[]);
    setInventory((inventoryResult.data??[]) as Inventory[]);
    if(!selectedChildId&&nextChildren[0])setSelectedChildId(nextChildren[0].id);
  },[householdId,selectedChildId]);

  useEffect(()=>{void load();},[load]);

  const selectedInventory=useMemo(
    ()=>inventory.find((item)=>item.child_profile_id===selectedChildId)??null,
    [inventory,selectedChildId]
  );

  function currentConsent(policy:ConsentPolicy,childId:string|null){
    return consents.find((item)=>
      item.consent_key===policy.consent_key
      && (item.child_profile_id??null)===(childId??null)
    );
  }

  async function recordConsent(policy:ConsentPolicy,action:"granted"|"revoked",childId:string|null){
    setWorking("consent:"+policy.consent_key+":"+(childId??"household"));
    setMessage("");
    const {error}=await supabase.rpc("record_household_consent",{
      p_household_id:householdId,
      p_consent_key:policy.consent_key,
      p_action:action,
      p_child_profile_id:childId||undefined,
      p_metadata:{surface:"privacy_controls",guardian_user_id:user.id}
    });
    setWorking("");
    if(error){setMessage(error.message);return;}
    setMessage(action==="granted"?"Consent recorded.":"Consent preference revoked.");
    await load();
  }

  async function submitRequest(){
    const needsChild=requestType==="export_child"||requestType==="delete_child";
    if(needsChild&&!selectedChildId){
      setMessage("Choose a child profile for this request.");
      return;
    }

    setWorking("request");
    setMessage("");

    const {error}=await supabase.rpc("request_data_privacy_action",{
      p_household_id:householdId,
      p_request_type:requestType,
      p_child_profile_id:needsChild?selectedChildId:undefined,
      p_reason:reason.trim()||undefined
    });

    setWorking("");
    if(error){setMessage(error.message);return;}
    setReason("");
    setMessage("Privacy request submitted for review.");
    await load();
  }

  async function openExport(request:PrivacyRequest){
    const exportStillAvailable =
      Boolean(request.export_reference)
      && Boolean(request.export_expires_at)
      && new Date(request.export_expires_at!).getTime() > Date.now();

    const action=exportStillAvailable?"download":"generate";
    setWorking("export:"+request.id);
    setMessage("");

    const {data,error}=await supabase.functions.invoke("privacy-export",{
      body:{
        action,
        request_id:request.id
      }
    });

    setWorking("");

    if(error){
      setMessage(error.message);
      return;
    }

    if(data?.error){
      setMessage(String(data.error));
      return;
    }

    if(data?.signed_url){
      const anchor=document.createElement("a");
      anchor.href=String(data.signed_url);
      anchor.target="_blank";
      anchor.rel="noopener noreferrer";
      anchor.download="dustin-courageous-adventure-club-data.json";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setMessage("Your private export download link is ready for 15 minutes.");
      await load();
      return;
    }

    setMessage("The export is not ready yet.");
  }

  async function cancelRequest(id:string){
    setWorking("cancel:"+id);setMessage("");
    const {error}=await supabase.rpc("cancel_data_privacy_request",{p_request_id:id});
    setWorking("");
    if(error){setMessage(error.message);return;}
    setMessage("Privacy request canceled.");
    await load();
  }

  async function archiveChild(childId:string){
    setWorking("archive:"+childId);setMessage("");
    const {error}=await supabase.rpc("archive_child_profile",{p_child_profile_id:childId});
    setWorking("");
    if(error){setMessage(error.message);return;}
    setMessage("Child profile archived. Progress is preserved and group participation is withdrawn.");
    await load();
    await onHouseholdUpdated();
  }

  async function restoreChild(childId:string){
    setWorking("restore:"+childId);setMessage("");
    const {error}=await supabase.rpc("restore_child_profile",{p_child_profile_id:childId});
    setWorking("");
    if(error){setMessage(error.message);return;}
    setMessage("Child profile restored.");
    await load();
    await onHouseholdUpdated();
  }

  const childPolicies=policies.filter((item)=>item.applies_to_child);
  const householdPolicies=policies.filter((item)=>!item.applies_to_child);

  return (
    <section className="privacy-controls-card">
      <div className="section-heading">
        <div>
          <p className="eyebrow red">Guardian Privacy</p>
          <h2>Data & consent controls</h2>
        </div>
        <span className="household-badge">{familyControlLabel(user.user_metadata?.family_relationship)}</span>
      </div>

      <p className="muted">
        Adventure Club keeps child profiles inside the family household. Permanent deletion requests are reviewed before destructive action. Archiving is immediate and preserves progress.
      </p>

      {message&&<div className="form-message">{message}</div>}

      <div className="privacy-two-column">
        <article className="privacy-panel">
          <p className="eyebrow gold">Household Consent</p>
          <div className="privacy-consent-list">
            {householdPolicies.map((policy)=>{
              const consent=currentConsent(policy,null);
              const granted=consent?.action==="granted"&&consent.policy_version===policy.current_policy_version;
              return (
                <div className="privacy-consent-row" key={policy.consent_key}>
                  <div>
                    <strong>{policy.title}</strong>
                    <p>{policy.description}</p>
                    <small>Policy v{policy.current_policy_version}{policy.required_for_core_service?" · core service":""}</small>
                  </div>
                  <button
                    type="button"
                    className={granted?"status-chip done":"secondary-button"}
                    disabled={working.startsWith("consent:")||Boolean(policy.required_for_core_service&&granted)}
                    onClick={()=>void recordConsent(policy,granted?"revoked":"granted",null)}
                  >
                    {granted?"Granted":"Grant"}
                  </button>
                </div>
              );
            })}
          </div>
        </article>

        <article className="privacy-panel">
          <p className="eyebrow gold">Child Participation</p>
          <label>
            Child profile
            <select value={selectedChildId} onChange={(event)=>setSelectedChildId(event.target.value)}>
              {children.map((child)=><option key={child.id} value={child.id}>{child.display_name} · {child.status}</option>)}
            </select>
          </label>

          <div className="privacy-consent-list">
            {childPolicies.map((policy)=>{
              const consent=currentConsent(policy,selectedChildId||null);
              const granted=consent?.action==="granted"&&consent.policy_version===policy.current_policy_version;
              return (
                <div className="privacy-consent-row" key={policy.consent_key}>
                  <div>
                    <strong>{policy.title}</strong>
                    <p>{policy.description}</p>
                    <small>Policy v{policy.current_policy_version}{policy.required_for_core_service?" · core service":""}</small>
                  </div>
                  <button
                    type="button"
                    className={granted?"status-chip done":"secondary-button"}
                    disabled={!selectedChildId||working.startsWith("consent:")||Boolean(policy.required_for_core_service&&granted)}
                    onClick={()=>void recordConsent(policy,granted?"revoked":"granted",selectedChildId||null)}
                  >
                    {granted?"Granted":"Grant"}
                  </button>
                </div>
              );
            })}
          </div>
        </article>
      </div>

      {selectedInventory&&(
        <article className="privacy-data-inventory">
          <div className="section-heading compact-heading">
            <div>
              <p className="eyebrow gold">What We Store</p>
              <h3>{selectedInventory.display_name}'s Adventure Club data</h3>
            </div>
            <span className="status-chip">{selectedInventory.status}</span>
          </div>

          <div className="privacy-inventory-grid">
            <div><strong>{selectedInventory.challenge_progress_records}</strong><span>Challenge progress</span></div>
            <div><strong>{selectedInventory.scripture_progress_records}</strong><span>Scripture progress</span></div>
            <div><strong>{selectedInventory.devotional_progress_records}</strong><span>Devotionals</span></div>
            <div><strong>{selectedInventory.book_progress_records}</strong><span>Book progress</span></div>
            <div><strong>{selectedInventory.reading_position_records}</strong><span>Saved reading places</span></div>
            <div><strong>{selectedInventory.xp_records}</strong><span>XP records</span></div>
            <div><strong>{selectedInventory.badge_records}</strong><span>Badges</span></div>
            <div><strong>{selectedInventory.reward_records}</strong><span>Rewards</span></div>
            <div><strong>{selectedInventory.group_membership_records}</strong><span>Group records</span></div>
          </div>

          <div className="privacy-profile-actions">
            {selectedInventory.status==="archived"?(
              <button className="secondary-button" disabled={!selectedInventory.child_profile_id || working.startsWith("restore:")} onClick={()=>{if(selectedInventory.child_profile_id)void restoreChild(selectedInventory.child_profile_id);}}>
                Restore child profile
              </button>
            ):(
              <button className="secondary-button" disabled={!selectedInventory.child_profile_id || working.startsWith("archive:")} onClick={()=>{if(selectedInventory.child_profile_id)void archiveChild(selectedInventory.child_profile_id);}}>
                Archive child profile
              </button>
            )}
          </div>
        </article>
      )}

      <article className="privacy-request-panel">
        <p className="eyebrow red">Data Requests</p>
        <h3>Export or deletion request</h3>

        <div className="privacy-request-form">
          <label>
            Request
            <select value={requestType} onChange={(event)=>setRequestType(event.target.value)}>
              <option value="export_household">Export household data</option>
              <option value="export_child">Export child data</option>
              <option value="delete_child">Request permanent child data deletion</option>
              <option value="delete_household">Request permanent household data deletion</option>
            </select>
          </label>

          {(requestType==="export_child"||requestType==="delete_child")&&(
            <label>
              Child
              <select value={selectedChildId} onChange={(event)=>setSelectedChildId(event.target.value)}>
                {children.map((child)=><option key={child.id} value={child.id}>{child.display_name}</option>)}
              </select>
            </label>
          )}

          <label className="privacy-reason">
            Note <span className="optional">(optional)</span>
            <textarea value={reason} onChange={(event)=>setReason(event.target.value)} placeholder="Anything you want the privacy team to know."/>
          </label>

          <button className="primary-button" disabled={working==="request"} onClick={()=>void submitRequest()}>
            Submit privacy request
          </button>
        </div>

        <div className="privacy-request-history">
          {requests.map((request)=>(
            <div key={request.id}>
              <div>
                <strong>{request.request_type.replaceAll("_"," ")}</strong>
                <span>{new Date(request.created_at).toLocaleString()}</span>
              </div>
              <span className={request.status==="completed"||request.status==="ready"?"status-chip done":"status-chip"}>{request.status.replaceAll("_"," ")}</span>
              {request.request_type.startsWith("export_")&&!["canceled","rejected","completed"].includes(request.status)&&(
                <button
                  className="secondary-button compact"
                  disabled={working==="export:"+request.id}
                  onClick={()=>void openExport(request)}
                >
                  {working==="export:"+request.id
                    ?"Preparing..."
                    : request.export_reference
                      && request.export_expires_at
                      && new Date(request.export_expires_at).getTime()>Date.now()
                        ?"Download export"
                        :"Generate export"}
                </button>
              )}
              {["requested","identity_confirmed"].includes(request.status)&&(
                <button className="text-button small" disabled={working==="cancel:"+request.id} onClick={()=>void cancelRequest(request.id)}>
                  Cancel
                </button>
              )}
            </div>
          ))}
          {!requests.length&&<p className="muted">No privacy requests have been submitted.</p>}
        </div>
      </article>
    </section>
  );
}
