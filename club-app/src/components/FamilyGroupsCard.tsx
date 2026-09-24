import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

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
  onOpenChallenge
}:{
  children:Child[];
  selectedChildId:string;
  onOpenChallenge:(challengeId:string)=>void;
}){
  const [memberships,setMemberships]=useState<Membership[]>([]);
  const [assignments,setAssignments]=useState<Assignment[]>([]);
  const [joinCode,setJoinCode]=useState("");
  const [joinChildId,setJoinChildId]=useState(selectedChildId);
  const [preview,setPreview]=useState<Preview|null>(null);
  const [working,setWorking]=useState(false);
  const [message,setMessage]=useState("");

  const childMap=useMemo(()=>new Map(children.map((child)=>[child.id,child.display_name])),[children]);

  const load=useCallback(async()=>{
    setMessage("");
    const childIds=children.map((child)=>child.id);
    if(!childIds.length){
      setMemberships([]);setAssignments([]);return;
    }

    const {data,error}=await supabase
      .from("child_group_memberships")
      .select("id,group_id,child_profile_id,status,joined_at,adventure_groups(id,name,group_type,organizations(id,name,organization_type))")
      .in("child_profile_id",childIds)
      .eq("status","active")
      .order("joined_at",{ascending:false});

    if(error){
      setMessage(error.message);return;
    }

    const next=(data??[]) as Membership[];
    setMemberships(next);

    const groupIds=Array.from(new Set(next.map((item)=>item.group_id)));
    if(!groupIds.length){
      setAssignments([]);return;
    }

    const assignmentResult=await supabase
      .from("group_challenge_assignments")
      .select("id,group_id,challenge_id,due_at,challenges(id,title,challenge_type,xp_reward)")
      .in("group_id",groupIds)
      .order("assigned_at",{ascending:false});

    if(assignmentResult.error){
      setMessage(assignmentResult.error.message);return;
    }

    setAssignments((assignmentResult.data??[]) as Assignment[]);
  },[children]);

  useEffect(()=>{void load();},[load]);

  useEffect(()=>{
    if(selectedChildId)setJoinChildId(selectedChildId);
  },[selectedChildId]);

  async function previewCode(event:FormEvent){
    event.preventDefault();
    setWorking(true);setMessage("");setPreview(null);

    const {data,error}=await supabase.rpc("preview_group_join_code",{p_code:joinCode.trim()});
    setWorking(false);

    if(error){
      setMessage(error.message);return;
    }

    const row=(data??[])[0] as Preview|undefined;
    if(!row){
      setMessage("That join code is invalid or expired.");
      return;
    }

    setPreview(row);
  }

  async function joinGroup(){
    if(!preview||!joinChildId)return;
    setWorking(true);setMessage("");

    const {error}=await supabase.rpc("join_child_to_group",{
      p_code:joinCode.trim(),
      p_child_profile_id:joinChildId
    });

    setWorking(false);

    if(error){
      setMessage(error.message);return;
    }

    setMessage((childMap.get(joinChildId)||"Child")+" joined "+preview.group_name+".");
    setJoinCode("");setPreview(null);
    await load();
  }

  async function withdraw(groupId:string,childId:string){
    setWorking(true);setMessage("");
    const {error}=await supabase.rpc("withdraw_child_from_group",{
      p_group_id:groupId,
      p_child_profile_id:childId
    });
    setWorking(false);
    if(error){
      setMessage(error.message);return;
    }
    setMessage((childMap.get(childId)||"Child")+" was removed from the group.");
    await load();
  }

  return (
    <section className="family-groups-card">
      <div className="section-heading">
        <div>
          <p className="eyebrow red">Adventure Club Groups</p>
          <h2>Church, school & homeschool connections</h2>
        </div>
        <span className="pill">{memberships.length} active</span>
      </div>

      {message&&<div className="form-message">{message}</div>}

      <form className="group-join-form" onSubmit={previewCode}>
        <label>
          Join code
          <input
            value={joinCode}
            onChange={(event)=>setJoinCode(event.target.value.toUpperCase().replace(/[^A-F0-9]/g,"").slice(0,10))}
            placeholder="ENTER CODE"
            required
          />
        </label>
        <label>
          Child
          <select value={joinChildId} onChange={(event)=>setJoinChildId(event.target.value)}>
            {children.map((child)=><option key={child.id} value={child.id}>{child.display_name}</option>)}
          </select>
        </label>
        <button className="secondary-button" disabled={working}>Preview group</button>
      </form>

      {preview&&(
        <article className="group-preview">
          <div>
            <span>{preview.organization_type.replaceAll("_"," ")}</span>
            <h3>{preview.organization_name}</h3>
            <p>{preview.group_name}</p>
          </div>
          <div className="group-preview-actions">
            {preview.spots_remaining!==null&&<small>{preview.spots_remaining} join-code use{preview.spots_remaining===1?"":"s"} remaining</small>}
            <button className="primary-button" type="button" disabled={working} onClick={()=>void joinGroup()}>
              Approve & Join
            </button>
          </div>
        </article>
      )}

      <div className="family-group-list">
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
                <button className="text-button small" disabled={working} onClick={()=>void withdraw(membership.group_id,membership.child_profile_id)}>
                  Leave group
                </button>
              </div>

              {groupAssignments.length>0&&(
                <div className="group-assignment-list">
                  {groupAssignments.map((assignment)=>{
                    const challenge=firstRelation(assignment.challenges);
                    return challenge?(
                      <button key={assignment.id} type="button" className="group-assignment-row" onClick={()=>onOpenChallenge(challenge.id)}>
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
      </div>
    </section>
  );
}
