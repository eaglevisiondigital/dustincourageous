import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { joinApprovedGroup, matchesGroupApproval, withdrawGroup } from "../lib/groupMembership";

type Child = { id: string; display_name: string };

type Membership = {
  id: string;
  group_id: string;
  child_profile_id: string;
  status: string;
  joined_at: string;
  adventure_groups:
    | {
        id: string;
        name: string;
        group_type: string;
        organizations:
          | { id: string; name: string; organization_type: string }
          | { id: string; name: string; organization_type: string }[]
          | null;
      }
    | {
        id: string;
        name: string;
        group_type: string;
        organizations:
          | { id: string; name: string; organization_type: string }
          | { id: string; name: string; organization_type: string }[]
          | null;
      }[]
    | null;
};

type Preview = {
  group_id: string;
  group_name: string;
  organization_name: string;
  organization_type: string;
  expires_at: string;
  spots_remaining: number | null;
};

type Assignment = {
  id: string;
  group_id: string;
  challenge_id: string;
  due_at: string | null;
  challenges:
    | { id: string; title: string; challenge_type: string; xp_reward: number }
    | { id: string; title: string; challenge_type: string; xp_reward: number }[]
    | null;
};

function firstRelation<T>(value:T|T[]|null):T|null{
  return Array.isArray(value)?value[0]??null:value;
}

export function FamilyGroupsCard({
  children,
  selectedChildId,
  onSelectChild,
  onOpenChallenge
}:{
  children:Child[];
  selectedChildId:string;
  onSelectChild:(childId:string)=>void;
  onOpenChallenge:(challengeId:string)=>void;
}){
  const [memberships,setMemberships]=useState<Membership[]>([]);
  const [assignments,setAssignments]=useState<Assignment[]>([]);
  const [joinCode,setJoinCode]=useState("");
  const [joinChildId,setJoinChildId]=useState(selectedChildId);
  const [preview,setPreview]=useState<(Preview & {code:string;childId:string})|null>(null);
  const [working,setWorking]=useState(false);
  const [message,setMessage]=useState("");
  const [loading,setLoading]=useState(true);
  const [loadError,setLoadError]=useState("");
  const loadVersion=useRef(0);
  const previewVersion=useRef(0);
  const actionBusy=useRef(false);
  const childIdsKey=JSON.stringify(children.map(child=>child.id).sort());

  const childMap=useMemo(()=>new Map(children.map((child)=>[child.id,child.display_name])),[children]);
  const previewAlreadyJoined=!!preview&&memberships.some(item=>item.group_id===preview.group_id&&item.child_profile_id===preview.childId);

  const load=useCallback(async()=>{
    const version=++loadVersion.current;
    setLoading(true);setLoadError("");
    const childIds=JSON.parse(childIdsKey) as string[];
    try {
    if(!childIds.length){
      setMemberships([]);setAssignments([]);return;
    }

    const {data,error}=await supabase
      .from("child_group_memberships")
      .select("id,group_id,child_profile_id,status,joined_at,adventure_groups(id,name,group_type,organizations(id,name,organization_type))")
      .in("child_profile_id",childIds)
      .eq("status","active")
      .order("joined_at",{ascending:false});

    if(version!==loadVersion.current)return;
    if(error)throw error;

    const next=(data??[]) as Membership[];

    const groupIds=Array.from(new Set(next.map((item)=>item.group_id)));
    if(!groupIds.length){
      setMemberships(next);setAssignments([]);return;
    }

    const assignmentResult=await supabase
      .from("group_challenge_assignments")
      .select("id,group_id,challenge_id,due_at,challenges(id,title,challenge_type,xp_reward)")
      .in("group_id",groupIds)
      .order("assigned_at",{ascending:false});

    if(version!==loadVersion.current)return;
    if(assignmentResult.error)throw assignmentResult.error;
    setMemberships(next);
    setAssignments((assignmentResult.data??[]) as Assignment[]);
    } catch {
      if(version===loadVersion.current)setLoadError("Group connections could not be loaded. Please try again.");
    } finally {
      if(version===loadVersion.current)setLoading(false);
    }
  },[childIdsKey]);

  useEffect(()=>{void load();return ()=>{loadVersion.current+=1;};},[load]);
  useEffect(()=>()=>{previewVersion.current+=1;},[]);

  useEffect(()=>{
    setJoinChildId(selectedChildId);
    previewVersion.current+=1;setPreview(null);
  },[selectedChildId]);

  async function previewCode(event:FormEvent){
    event.preventDefault();
    if(actionBusy.current||!childMap.has(joinChildId)||!joinCode.trim())return;
    actionBusy.current=true;
    const version=++previewVersion.current;
    const code=joinCode.trim();
    const childId=joinChildId;
    setWorking(true);setMessage("");setPreview(null);
    try {
    const {data,error}=await supabase.rpc("preview_group_join_code",{p_code:code});
    if(version!==previewVersion.current)return;
    if(error)throw error;

    const row=(data??[])[0] as Preview|undefined;
    if(!row){
      setMessage("That join code is invalid or expired.");
      return;
    }

    setPreview({...row,code,childId});
    } catch {
      if(version===previewVersion.current)setMessage("The group preview could not be loaded. Check the code and try again.");
    } finally {
      actionBusy.current=false;setWorking(false);
    }
  }

  async function joinGroup(){
    if(actionBusy.current||loading||loadError||!preview||previewAlreadyJoined||!childMap.has(joinChildId))return;
    const approval={code:preview.code,childId:preview.childId,groupId:preview.group_id};
    if(!matchesGroupApproval(approval,joinCode,joinChildId)){setPreview(null);return;}
    actionBusy.current=true;
    setWorking(true);setMessage("");
    try {
    await joinApprovedGroup(supabase,approval);
    setMessage((childMap.get(approval.childId)||"Child")+" joined "+preview.group_name+".");
    setJoinCode("");setPreview(null);
    } catch {
      setPreview(null);
      setMessage("Joining could not be confirmed. Check the refreshed connections before previewing the code again.");
    } finally {
      await load();actionBusy.current=false;setWorking(false);
    }
  }

  async function withdraw(groupId:string,childId:string){
    if(actionBusy.current||loading||loadError)return;
    actionBusy.current=true;
    setWorking(true);setMessage("");
    try {
    await withdrawGroup(supabase,groupId,childId);
    setMessage((childMap.get(childId)||"Child")+" was removed from the group.");
    } catch {
      setMessage("Leaving could not be confirmed. Check the refreshed group connections before trying again.");
    } finally {
      await load();actionBusy.current=false;setWorking(false);
    }
  }

  return (
    <section className="family-groups-card">
      <div className="section-heading">
        <div>
          <p className="eyebrow red">Adventure Club Groups</p>
          <h2>Church, School & Homeschool Connections</h2>
        </div>
        {!loading&&!loadError&&<span className="pill">{memberships.length} active</span>}
      </div>

      {message&&<div className="form-message" role="status">{message}</div>}

      <form className="group-join-form" onSubmit={previewCode}>
        <label>
          Join Code
          <input
            disabled={working}
            value={joinCode}
            onChange={(event)=>{setJoinCode(event.target.value.toUpperCase().replace(/[^A-F0-9]/g,"").slice(0,10));previewVersion.current+=1;setPreview(null);}}
            placeholder="ENTER CODE"
            required
          />
        </label>
        <label>
          Child
          <select disabled={working} value={joinChildId} onChange={(event)=>{setJoinChildId(event.target.value);previewVersion.current+=1;setPreview(null);}}>
            {children.map((child)=><option key={child.id} value={child.id}>{child.display_name}</option>)}
          </select>
        </label>
        <button className="secondary-button" disabled={working||loading||!!loadError||!childMap.has(joinChildId)}>Preview Group</button>
      </form>

      {preview&&(
        <article className="group-preview">
          <div>
            <span>{preview.organization_type.replaceAll("_"," ")}</span>
            <h3>{preview.organization_name}</h3>
            <p>{preview.group_name}</p>
            <p>Approve participation for <strong>{childMap.get(preview.childId)}</strong>.</p>
          </div>
          <div className="group-preview-actions">
            {preview.spots_remaining!==null&&<small>{preview.spots_remaining} join-code use{preview.spots_remaining===1?"":"s"} remaining</small>}
            <button className="primary-button" type="button" disabled={working||loading||!!loadError||previewAlreadyJoined} onClick={()=>void joinGroup()}>
              {previewAlreadyJoined?"Already connected":"Approve & Join"}
            </button>
          </div>
        </article>
      )}

      {loading?<p role="status">Loading group connections...</p>:loadError?<div><p role="alert">{loadError}</p><button type="button" className="secondary-button" disabled={working} onClick={()=>void load()}>Retry Connections</button></div>:<div className="family-group-list">
        {memberships.map((membership)=>{
          const group=firstRelation(membership.adventure_groups);
          const org=group?firstRelation(group.organizations):null;
          const groupAssignments=assignments.filter((item)=>item.group_id===membership.group_id);
          return (
            <article className="family-group-row" key={membership.id}>
              <div className="family-group-head">
                <div>
                  <span>{org?.organization_type?.replaceAll("_"," ")||"group"}</span>
                  <h3>{group?.name||"Adventure Club Group"}</h3>
                  <p>{org?.name} · {childMap.get(membership.child_profile_id)}</p>
                </div>
                <button type="button" className="text-button small" disabled={working} onClick={()=>void withdraw(membership.group_id,membership.child_profile_id)}>
                  Leave Group
                </button>
              </div>

              {groupAssignments.length>0&&(
                <div className="group-assignment-list">
                  {membership.child_profile_id!==selectedChildId&&<button type="button" className="secondary-button" disabled={working} onClick={()=>onSelectChild(membership.child_profile_id)}>Select {childMap.get(membership.child_profile_id)} to open these challenges</button>}
                  {groupAssignments.map((assignment)=>{
                    const challenge=firstRelation(assignment.challenges);
                    return challenge?(
                      <button key={assignment.id} type="button" className="group-assignment-row" disabled={working||membership.child_profile_id!==selectedChildId} onClick={()=>onOpenChallenge(challenge.id)}>
                        <div>
                          <span>{challenge.challenge_type.replaceAll("_"," ")}</span>
                          <strong>{challenge.title}</strong>
                        </div>
                        <small>+{challenge.xp_reward} XP{assignment.due_at?" · due "+new Date(assignment.due_at).toLocaleDateString():""}</small>
                      </button>
                    ):null;
                  })}
                </div>
              )}
            </article>
          );
        })}
        {!memberships.length&&<p className="muted">No group connections yet. A trusted leader can provide a join code.</p>}
      </div>}
    </section>
  );
}
