import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { readLeaderGroup } from "../lib/leaderGroupData";

type OrgMembership = {
  role: string;
  organizations:
    | { id:string; name:string; organization_type:string; status:string }
    | { id:string; name:string; organization_type:string; status:string }[]
    | null;
};

type Group = {
  id:string;
  organization_id:string;
  group_key:string;
  name:string;
  group_type:string;
  description:string|null;
  status:string;
};

type Challenge = {
  id:string;
  title:string;
  challenge_type:string;
  xp_reward:number;
};

type Assignment = {
  id:string;
  challenge_id:string;
  due_at:string|null;
  challenges:
    | Challenge
    | Challenge[]
    | null;
};

type Roster = {
  child_profile_id:string;
  display_name:string;
  membership_status:string;
  joined_at:string;
};

type Progress = {
  active_children:number;
  completed_children:number;
  completion_percent:number;
};

type OrgInvitation = {
  id:string;
  email:string;
  organization_role:string;
  group_id:string|null;
  group_role:string|null;
  status:string;
  expires_at:string;
  adventure_groups:
    | { name:string }
    | { name:string }[]
    | null;
};

function firstRelation<T>(value:T|T[]|null):T|null{
  return Array.isArray(value)?value[0]??null:value;
}
function slugify(value:string){
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
}

export function LeaderGroupsHub(){
  const [orgMemberships,setOrgMemberships]=useState<OrgMembership[]>([]);
  const [groups,setGroups]=useState<Group[]>([]);
  const [challenges,setChallenges]=useState<Challenge[]>([]);
  const [assignments,setAssignments]=useState<Assignment[]>([]);
  const [roster,setRoster]=useState<Roster[]>([]);
  const [progress,setProgress]=useState<Record<string,Progress>>({});
  const [selectedOrgId,setSelectedOrgId]=useState("");
  const [selectedGroupId,setSelectedGroupId]=useState("");
  const [message,setMessage]=useState("");
  const [joinCode,setJoinCode]=useState("");
  const [working,setWorking]=useState(false);
  const versions=useRef({base:0,groups:0,invitations:0,detail:0});
  const actionBusy=useRef(false);
  const [baseLoading,setBaseLoading]=useState(true);
  const [groupsLoading,setGroupsLoading]=useState(false);
  const [detailLoading,setDetailLoading]=useState(false);
  const [loadErrors,setLoadErrors]=useState({base:"",groups:"",invitations:"",detail:""});
  const [invitations,setInvitations]=useState<OrgInvitation[]>([]);
  const [inviteEmail,setInviteEmail]=useState("");
  const [inviteRole,setInviteRole]=useState("leader");
  const [inviteGroupId,setInviteGroupId]=useState("");
  const [inviteGroupRole,setInviteGroupRole]=useState("leader");
  const [inviteLink,setInviteLink]=useState("");

  const [groupName,setGroupName]=useState("");
  const [groupKey,setGroupKey]=useState("");
  const [groupType,setGroupType]=useState("kids_group");
  const [description,setDescription]=useState("");
  const [minAge,setMinAge]=useState("");
  const [maxAge,setMaxAge]=useState("");

  const [challengeId,setChallengeId]=useState("");
  const [dueDate,setDueDate]=useState("");

  const orgs=useMemo(
    ()=>orgMemberships.map((m)=>({membership:m,org:firstRelation(m.organizations)})).filter((x)=>x.org),
    [orgMemberships]
  );
  const selectedMembership=orgs.find((item)=>item.org!.id===selectedOrgId)?.membership;
  const canManageOrg=selectedMembership?.role==="owner"||selectedMembership?.role==="admin";

  const loadBase=useCallback(async()=>{
    const version=++versions.current.base;
    setBaseLoading(true);setLoadErrors(old=>({...old,base:""}));
    try {
    const {data:{user},error:authError}=await supabase.auth.getUser();
    if(authError||!user)throw authError||new Error("Sign in to load leader access.");

    const [membershipResult,challengeResult]=await Promise.all([
      supabase
        .from("organization_members")
        .select("role,organizations(id,name,organization_type,status)")
        .eq("user_id",user.id)
        .eq("status","active"),
      supabase
        .from("challenges")
        .select("id,title,challenge_type,xp_reward")
        .eq("status","published")
        .order("created_at",{ascending:false})
        .limit(100)
    ]);

    const error=membershipResult.error||challengeResult.error;
    if(error)throw error;
    if(version!==versions.current.base)return;

    const nextMemberships=(membershipResult.data??[]) as OrgMembership[];
    const nextChallenges=(challengeResult.data??[]) as Challenge[];
    setOrgMemberships(nextMemberships);
    setChallenges(nextChallenges);
    setChallengeId(current=>nextChallenges.some(item=>item.id===current)?current:nextChallenges[0]?.id??"");

    const firstOrg=firstRelation(nextMemberships[0]?.organizations??null);
    setSelectedOrgId(current=>nextMemberships.some(item=>firstRelation(item.organizations)?.id===current)?current:firstOrg?.id??"");
    } catch {
      if(version===versions.current.base)setLoadErrors(old=>({...old,base:"Leader access could not be loaded."}));
    } finally { if(version===versions.current.base)setBaseLoading(false); }
  },[]);

  const loadGroups=useCallback(async()=>{
    const version=++versions.current.groups;
    setLoadErrors(old=>({...old,groups:""}));
    if(!selectedOrgId){setGroups([]);setSelectedGroupId("");setGroupsLoading(false);return;}
    setGroupsLoading(true);
    try {
    const {data,error}=await supabase
      .from("adventure_groups")
      .select("id,organization_id,group_key,name,group_type,description,status")
      .eq("organization_id",selectedOrgId)
      .order("created_at",{ascending:true});
    if(error)throw error;
    if(version!==versions.current.groups)return;
    const next=(data??[]) as Group[];
    setGroups(next);
    setSelectedGroupId(current=>next.some(g=>g.id===current)?current:next[0]?.id??"");
    } catch {
      if(version===versions.current.groups){setGroups([]);setSelectedGroupId("");setLoadErrors(old=>({...old,groups:"Groups could not be loaded."}));}
    } finally { if(version===versions.current.groups)setGroupsLoading(false); }
  },[selectedOrgId]);

  const loadInvitations=useCallback(async()=>{
    const version=++versions.current.invitations;
    setInvitations([]);setLoadErrors(old=>({...old,invitations:""}));
    if(!selectedOrgId||!canManageOrg){
      setInvitations([]);
      return;
    }

    try {
    const {data,error}=await supabase
      .from("organization_invitations")
      .select("id,email,organization_role,group_id,group_role,status,expires_at,adventure_groups(name)")
      .eq("organization_id",selectedOrgId)
      .order("created_at",{ascending:false})
      .limit(50);

    if(error)throw error;
    if(version!==versions.current.invitations)return;
    setInvitations((data??[]) as OrgInvitation[]);
    } catch { if(version===versions.current.invitations)setLoadErrors(old=>({...old,invitations:"Adult invitations could not be loaded."})); }
  },[selectedOrgId,canManageOrg]);

  const loadGroupDetail=useCallback(async()=>{
    const version=++versions.current.detail;
    setAssignments([]);setRoster([]);setProgress({});
    setLoadErrors(old=>({...old,detail:""}));setDetailLoading(false);
    if(!selectedGroupId){
      return;
    }
    setDetailLoading(true);
    try {
      const result=await readLeaderGroup(supabase,selectedGroupId);
      if(version!==versions.current.detail)return;
      setAssignments(result.assignments);setRoster(result.roster);setProgress(result.progress);
    } catch { if(version===versions.current.detail)setLoadErrors(old=>({...old,detail:"Roster and progress could not be loaded."})); }
    finally { if(version===versions.current.detail)setDetailLoading(false); }
  },[selectedGroupId]);

  useEffect(()=>{void loadBase();return ()=>{versions.current.base++;};},[loadBase]);
  useEffect(()=>{void loadGroups();return ()=>{versions.current.groups++;};},[loadGroups]);
  useEffect(()=>{void loadInvitations();return ()=>{versions.current.invitations++;};},[loadInvitations]);
  useEffect(()=>{setJoinCode("");void loadGroupDetail();return ()=>{versions.current.detail++;};},[loadGroupDetail]);

  function clearGroupView(){
    versions.current.detail++;
    setJoinCode("");setAssignments([]);setRoster([]);setProgress({});setDueDate("");setDetailLoading(true);
  }

  async function runAction(action:()=>Promise<void>){
    if(actionBusy.current)return;
    actionBusy.current=true;setWorking(true);
    try { await action(); }
    catch { setMessage("The action could not be confirmed. Refresh the group before trying again."); }
    finally { actionBusy.current=false;setWorking(false); }
  }

  async function createGroup(event:FormEvent){
    event.preventDefault();
    if(!selectedOrgId)return;
    setWorking(true);setMessage("");

    const {data,error}=await supabase.rpc("create_adventure_group",{
      p_organization_id:selectedOrgId,
      p_group_key:groupKey||slugify(groupName),
      p_name:groupName.trim(),
      p_group_type:groupType,
      p_description:description.trim()||undefined,
      p_minimum_age:minAge?Number(minAge):undefined,
      p_maximum_age:maxAge?Number(maxAge):undefined
    });

    if(error){setMessage(error.message);return;}

    if(typeof data!=="string"||!data)throw new Error("Group creation could not be confirmed.");
    setGroupName("");setGroupKey("");setDescription("");setMinAge("");setMaxAge("");
    setMessage("Adventure Club group created.");
    await loadGroups();
    if(typeof data==="string"){clearGroupView();setSelectedGroupId(data);}
  }

  async function createAdultInvitation(event:FormEvent){
    event.preventDefault();
    if(!selectedOrgId)return;

    if(inviteRole==="leader"&&!inviteGroupId){
      setMessage("Choose the specific group this leader will be approved to lead.");
      return;
    }

    setWorking(true);
    setMessage("");
    setInviteLink("");

    const {data,error}=await supabase.rpc("create_organization_invitation",{
      p_organization_id:selectedOrgId,
      p_email:inviteEmail.trim(),
      p_organization_role:inviteRole,
      p_group_id:inviteRole==="leader"?inviteGroupId||undefined:undefined,
      p_group_role:inviteRole==="leader"?inviteGroupRole:undefined,
      p_expires_in_days:7
    });


    if(error){
      setMessage(error.message);
      return;
    }

    const row=(data??[])[0];
    if(row?.invitation_id&&row?.invitation_token){
      const link=
        window.location.origin+
        "/org-invite?id="+
        encodeURIComponent(row.invitation_id)+
        "&token="+
        encodeURIComponent(row.invitation_token);
      setInviteLink(link);
      setInviteEmail("");
      setMessage("Leader invitation created. Copy the secure link and send it to the invited adult.");
      await loadInvitations();
    } else throw new Error("Invitation creation could not be confirmed.");
  }

  async function cancelAdultInvitation(id:string){
    setWorking(true);
    setMessage("");

    const {error}=await supabase.rpc("cancel_organization_invitation",{
      p_invitation_id:id
    });


    if(error){
      setMessage(error.message);
      return;
    }

    setInviteLink("");
    setMessage("Organization invitation canceled.");
    await loadInvitations();
  }

  async function generateCode(){
    if(!selectedGroupId)return;
    setWorking(true);setMessage("");
    const {data,error}=await supabase.rpc("create_group_join_code",{
      p_group_id:selectedGroupId,
      p_expires_in_days:30
    });
    if(error){setMessage(error.message);return;}
    if(!data)throw new Error("No join code returned");
    setJoinCode(data);
  }

  async function assignChallenge(){
    if(!selectedGroupId||!challengeId)return;
    setWorking(true);setMessage("");
    const {data:{user}}=await supabase.auth.getUser();
    if(!user)throw new Error("Sign in again to assign a challenge.");

    const {data,error}=await supabase.from("group_challenge_assignments").upsert({
      group_id:selectedGroupId,
      challenge_id:challengeId,
      assigned_by:user.id,
      due_at:dueDate?new Date(dueDate+"T23:59:59").toISOString():null
    },{onConflict:"group_id,challenge_id"}).select("group_id,challenge_id").single();

    if(error){setMessage(error.message);return;}
    if(data?.group_id!==selectedGroupId||data?.challenge_id!==challengeId)throw new Error("Assignment could not be confirmed.");
    setMessage("Challenge assigned to the group.");
    setDueDate("");
    await loadGroupDetail();
  }

  if(baseLoading)return <section className="leader-groups-hub" role="status">Loading leader access...</section>;
  if(loadErrors.base)return <section className="leader-groups-hub"><p role="alert">{loadErrors.base}</p><button className="secondary-button" onClick={()=>void loadBase()}>Retry leader access</button></section>;
  if(!orgs.length)return null;

  return (
    <section className="leader-groups-hub">
      <div className="section-heading">
        <div>
          <p className="eyebrow gold">Leader Hub</p>
          <h2>Adventure Club Groups</h2>
        </div>
        <span className="pill">Approved organization access</span>
      </div>

      {message&&<div className="form-message" role="status">{message}</div>}
      {(["groups","invitations","detail"] as const).map(key=>loadErrors[key]&&<div className="form-message" role="alert" key={key}>{loadErrors[key]} <button className="text-button" disabled={working} onClick={()=>void (key==="groups"?loadGroups():key==="invitations"?loadInvitations():loadGroupDetail())}>Retry</button></div>)}

      <div className="leader-group-selectors">
        <label>
          Organization
          <select disabled={working} value={selectedOrgId} onChange={(event)=>{
            if(actionBusy.current)return;
            versions.current.groups++;versions.current.invitations++;clearGroupView();
            setGroups([]);setInvitations([]);setInviteGroupId("");setInviteLink("");setMessage("");
            setSelectedOrgId(event.target.value);setSelectedGroupId("");
          }}>
            {orgs.map(({membership,org})=><option key={org!.id} value={org!.id}>{org!.name} · {membership.role}</option>)}
          </select>
        </label>
        <label>
          Group
          <select disabled={working||groupsLoading} value={selectedGroupId} onChange={(event)=>{
            if(actionBusy.current)return;
            clearGroupView();setMessage("");setSelectedGroupId(event.target.value);
          }}>
            <option value="">Select group</option>
            {groups.map((group)=><option key={group.id} value={group.id}>{group.name}</option>)}
          </select>
        </label>
      </div>

      {canManageOrg&&(
        <section className="leader-adult-invites">
          <div className="section-heading compact-heading">
            <div>
              <p className="eyebrow red">Adult Access</p>
              <h3>Invite an organization admin or group leader</h3>
            </div>
          </div>

          <form className="admin-form" onSubmit={(event)=>{event.preventDefault();void runAction(()=>createAdultInvitation(event));}}>
            <label>
              Adult Email
              <input disabled={working}
                required
                type="email"
                value={inviteEmail}
                onChange={(event)=>setInviteEmail(event.target.value)}
              />
            </label>

            <label>
              Organization role
              <select disabled={working} value={inviteRole} onChange={(event)=>setInviteRole(event.target.value)}>
                <option value="leader">Group leader</option>
                <option value="admin">Organization admin</option>
              </select>
            </label>

            {inviteRole==="leader"&&(
              <>
                <label>
                  Approved group
                  <select disabled={working}
                    required
                    value={inviteGroupId}
                    onChange={(event)=>setInviteGroupId(event.target.value)}
                  >
                    <option value="">Choose group</option>
                    {groups.map((group)=>(
                      <option key={group.id} value={group.id}>{group.name}</option>
                    ))}
                  </select>
                </label>

                <label>
                  Group role
                  <select disabled={working} value={inviteGroupRole} onChange={(event)=>setInviteGroupRole(event.target.value)}>
                    <option value="lead">Lead</option>
                    <option value="leader">Leader</option>
                    <option value="assistant">Assistant</option>
                  </select>
                </label>
              </>
            )}

            <button className="secondary-button full" disabled={working}>
              Create secure adult invitation
            </button>
          </form>

          {inviteLink&&(
            <div className="leader-invite-link">
              <strong>Invitation link</strong>
              <code>{inviteLink}</code>
              <button
                type="button"
                className="secondary-button"
                disabled={working}
                onClick={async()=>{
                  try {
                    if(!navigator.clipboard)throw new Error("Clipboard unavailable");
                    await navigator.clipboard.writeText(inviteLink);
                    setMessage("Invitation link copied.");
                  } catch { setMessage("Copy was unavailable. Select and copy the invitation link above."); }
                }}
              >
                Copy invitation link
              </button>
            </div>
          )}

          {invitations.length>0&&(
            <div className="leader-invitation-list">
              {invitations.map((invitation)=>{
                const group=firstRelation(invitation.adventure_groups);
                return (
                  <article key={invitation.id}>
                    <div>
                      <strong>{invitation.email}</strong>
                      <span>
                        {invitation.organization_role}
                        {group?.name?" · "+group.name:""}
                        {invitation.group_role?" · "+invitation.group_role:""}
                      </span>
                      <small>Expires {new Date(invitation.expires_at).toLocaleDateString()}</small>
                    </div>
                    <div>
                      <span className={invitation.status==="accepted"?"status-chip done":"status-chip"}>
                        {invitation.status}
                      </span>
                      {invitation.status==="invited"&&(
                        <button
                          type="button"
                          className="text-button small"
                          disabled={working}
                          onClick={()=>void runAction(()=>cancelAdultInvitation(invitation.id))}
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}

      {canManageOrg&&(
        <details className="leader-create-group">
          <summary>Create another group</summary>
          <form className="admin-form" onSubmit={(event)=>{event.preventDefault();void runAction(()=>createGroup(event));}}>
            <label>
              Name
              <input disabled={working} required value={groupName} onChange={(event)=>{setGroupName(event.target.value);if(!groupKey)setGroupKey(slugify(event.target.value));}}/>
            </label>
            <label>
              Key
              <input disabled={working} required value={groupKey} onChange={(event)=>setGroupKey(slugify(event.target.value))}/>
            </label>
            <label>
              Type
              <select disabled={working} value={groupType} onChange={(event)=>setGroupType(event.target.value)}>
                <option value="church_class">Church class</option>
                <option value="school_class">School class</option>
                <option value="homeschool_group">Homeschool group</option>
                <option value="kids_group">Kids group</option>
                <option value="club">Club</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label>Minimum age<input disabled={working} type="number" min="0" max="18" value={minAge} onChange={(event)=>setMinAge(event.target.value)}/></label>
            <label>Maximum age<input disabled={working} type="number" min="0" max="18" value={maxAge} onChange={(event)=>setMaxAge(event.target.value)}/></label>
            <label className="full">Description<textarea disabled={working} value={description} onChange={(event)=>setDescription(event.target.value)}/></label>
            <button className="secondary-button full" disabled={working}>Create group</button>
          </form>
        </details>
      )}

      {selectedGroupId&&(
        <>
          <div className="leader-code-card">
            <div>
              <span>Guardian Join Code</span>
              <strong>{joinCode||"Generate a new 30-day code"}</strong>
              <small>Families must sign in, preview the group, choose their child, and explicitly approve joining.</small>
            </div>
            <button className="secondary-button" disabled={working} onClick={()=>void runAction(generateCode)}>
              Generate code
            </button>
          </div>

          <div className="leader-groups-grid">
            <article className="leader-panel">
              <p className="eyebrow red">Assign Challenge</p>
              <label>
                Challenge
                <select disabled={working} value={challengeId} onChange={(event)=>setChallengeId(event.target.value)}>
                  {challenges.map((challenge)=><option key={challenge.id} value={challenge.id}>{challenge.title} · +{challenge.xp_reward} XP</option>)}
                </select>
              </label>
              <label>
                Due date <span className="optional">(optional)</span>
                <input disabled={working} type="date" value={dueDate} onChange={(event)=>setDueDate(event.target.value)}/>
              </label>
              <button className="primary-button" disabled={working||!challengeId} onClick={()=>void runAction(assignChallenge)}>
                Assign to group
              </button>
            </article>

            <article className="leader-panel">
              <div className="section-heading compact-heading">
                <div><p className="eyebrow gold">Roster</p><h3>{detailLoading?"Loading...":loadErrors.detail?"Unavailable":roster.length+" active"}</h3></div>
              </div>
              <div className="leader-roster">
                {roster.map((child)=><div key={child.child_profile_id}><span className="avatar">{child.display_name.slice(0,1).toUpperCase()}</span><strong>{child.display_name}</strong></div>)}
                {!detailLoading&&!loadErrors.detail&&!roster.length&&<p className="muted">No children have joined yet.</p>}
              </div>
            </article>
          </div>

          <div className="leader-assignment-progress">
            {assignments.map((assignment)=>{
              const challenge=firstRelation(assignment.challenges);
              const summary=progress[assignment.challenge_id];
              return challenge?(
                <article key={assignment.id}>
                  <div>
                    <span>{challenge.challenge_type.replaceAll("_"," ")}</span>
                    <strong>{challenge.title}</strong>
                    <small>{summary?.completed_children??0} of {summary?.active_children??0} completed{assignment.due_at?" · due "+new Date(assignment.due_at).toLocaleDateString():""}</small>
                  </div>
                  <div className="leader-progress-meter">
                    <strong>{summary?.completion_percent??0}%</strong>
                    <div className="level-progress-track"><span style={{width:(summary?.completion_percent??0)+"%"}}/></div>
                  </div>
                </article>
              ):null;
            })}
          </div>
        </>
      )}
    </section>
  );
}
