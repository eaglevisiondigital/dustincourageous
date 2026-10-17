import { FormEvent, useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type EventRow={
  id:string;
  event_key:string;
  title:string;
  event_type:string;
  starts_at:string;
  status:string;
  capacity:number|null;
  organization_id:string|null;
  group_id:string|null;
};

type Org={id:string;name:string};
type Group={id:string;name:string;organization_id:string};

function slugify(value:string){
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
}

export function EventsAdmin(){
  const [events,setEvents]=useState<EventRow[]>([]);
  const [orgs,setOrgs]=useState<Org[]>([]);
  const [groups,setGroups]=useState<Group[]>([]);
  const [message,setMessage]=useState("");
  const [working,setWorking]=useState(false);

  const [title,setTitle]=useState("");
  const [key,setKey]=useState("");
  const [type,setType]=useState("family");
  const [description,setDescription]=useState("");
  const [startsAt,setStartsAt]=useState("");
  const [endsAt,setEndsAt]=useState("");
  const [timezone,setTimezone]=useState("America/Chicago");
  const [locationName,setLocationName]=useState("");
  const [locationAddress,setLocationAddress]=useState("");
  const [virtualUrl,setVirtualUrl]=useState("");
  const [capacity,setCapacity]=useState("");
  const [access,setAccess]=useState("free");
  const [status,setStatus]=useState("draft");
  const [organizationId,setOrganizationId]=useState("");
  const [groupId,setGroupId]=useState("");

  const load=useCallback(async()=>{
    const [eventResult,orgResult,groupResult]=await Promise.all([
      supabase.from("events").select("id,event_key,title,event_type,starts_at,status,capacity,organization_id,group_id").order("starts_at",{ascending:false}).limit(100),
      supabase.from("organizations").select("id,name").eq("status","active").order("name"),
      supabase.from("adventure_groups").select("id,name,organization_id").eq("status","active").order("name")
    ]);
    const error=eventResult.error||orgResult.error||groupResult.error;
    if(error){setMessage(error.message);return;}
    setEvents((eventResult.data??[]) as EventRow[]);
    setOrgs((orgResult.data??[]) as Org[]);
    setGroups((groupResult.data??[]) as Group[]);
  },[]);

  useEffect(()=>{void load();},[load]);

  async function createEvent(event:FormEvent){
    event.preventDefault();
    setWorking(true);setMessage("");
    const {data:{user}}=await supabase.auth.getUser();
    if(!user){setWorking(false);return;}

    const {error}=await supabase.from("events").insert({
      event_key:key||slugify(title),
      title:title.trim(),
      description:description.trim()||null,
      event_type:type,
      organization_id:organizationId||null,
      group_id:groupId||null,
      starts_at:new Date(startsAt).toISOString(),
      ends_at:endsAt?new Date(endsAt).toISOString():null,
      timezone,
      location_name:locationName.trim()||null,
      location_address:locationAddress.trim()||null,
      virtual_url:virtualUrl.trim()||null,
      capacity:capacity?Number(capacity):null,
      access_level:access,
      status,
      created_by:user.id
    });

    setWorking(false);
    if(error){setMessage(error.message);return;}

    setTitle("");setKey("");setDescription("");setStartsAt("");setEndsAt("");setLocationName("");setLocationAddress("");setVirtualUrl("");setCapacity("");
    setMessage("Event created.");
    await load();
  }

  async function changeStatus(id:string,nextStatus:string){
    const {error}=await supabase.from("events").update({status:nextStatus}).eq("id",id);
    if(error){setMessage(error.message);return;}
    await load();
  }

  const filteredGroups=organizationId?groups.filter((g)=>g.organization_id===organizationId):groups;

  return (
    <div className="admin-two-column">
      <section className="admin-card">
        <p className="eyebrow red">Events</p>
        <h2>Create experience</h2>
        <form className="admin-form" onSubmit={createEvent}>
          <label>Title<input required value={title} onChange={(event)=>{setTitle(event.target.value);if(!key)setKey(slugify(event.target.value));}}/></label>
          <label>Key<input required value={key} onChange={(event)=>setKey(slugify(event.target.value))}/></label>
          <label>Type<select value={type} onChange={(event)=>setType(event.target.value)}><option value="family">Family</option><option value="kids">Kids</option><option value="launch">Launch</option><option value="reading">Reading</option><option value="church">Church</option><option value="school">School</option><option value="homeschool">Homeschool</option><option value="online">Online</option><option value="general">General</option><option value="other">Other</option></select></label>
          <label>Access<select value={access} onChange={(event)=>setAccess(event.target.value)}><option value="free">Free access</option><option value="member">All signed-in families</option><option value="premium">Paid membership</option></select></label>
          <label>Starts<input required type="datetime-local" value={startsAt} onChange={(event)=>setStartsAt(event.target.value)}/></label>
          <label>Ends<input type="datetime-local" value={endsAt} onChange={(event)=>setEndsAt(event.target.value)}/></label>
          <label>Timezone<input value={timezone} onChange={(event)=>setTimezone(event.target.value)}/></label>
          <label>Capacity<input type="number" min="1" value={capacity} onChange={(event)=>setCapacity(event.target.value)}/></label>
          <label>Organization<select value={organizationId} onChange={(event)=>{setOrganizationId(event.target.value);setGroupId("");}}><option value="">Platform-wide</option>{orgs.map((org)=><option key={org.id} value={org.id}>{org.name}</option>)}</select></label>
          <label>Group<select value={groupId} onChange={(event)=>setGroupId(event.target.value)}><option value="">No specific group</option>{filteredGroups.map((group)=><option key={group.id} value={group.id}>{group.name}</option>)}</select></label>
          <label>Location name<input value={locationName} onChange={(event)=>setLocationName(event.target.value)}/></label>
          <label>Virtual URL<input type="url" value={virtualUrl} onChange={(event)=>setVirtualUrl(event.target.value)}/></label>
          <label className="full">Location address<input value={locationAddress} onChange={(event)=>setLocationAddress(event.target.value)}/></label>
          <label className="full">Description<textarea value={description} onChange={(event)=>setDescription(event.target.value)}/></label>
          <label>Status<select value={status} onChange={(event)=>setStatus(event.target.value)}><option value="draft">Draft</option><option value="published" disabled>Publish through DC Governance</option></select></label>
          <button className="primary-button full" disabled={working}>Create event</button>
        </form>
        {message&&<div className="form-message" style={{marginTop:14}}>{message}</div>}
      </section>

      <section className="admin-card">
        <div className="section-heading compact-heading"><div><p className="eyebrow gold">Schedule</p><h2>Events</h2></div><span className="pill">{events.length}</span></div>
        <div className="admin-list">
          {events.map((event)=>(
            <article className="commerce-order-row" key={event.id}>
              <div><strong>{event.title}</strong><small>{event.event_type} · {new Date(event.starts_at).toLocaleString()}</small></div>
              <span className={event.status==="published"?"status-chip done":"status-chip"}>{event.status}</span>
              <select value={event.status} onChange={(e)=>void changeStatus(event.id,e.target.value)}>
                <option value="draft">Draft</option>
                <option value="published" disabled>Publish through DC Governance</option>
                <option value="canceled">Canceled</option>
                <option value="completed">Completed</option>
                <option value="archived">Archived</option>
              </select>
            </article>
          ))}
          {!events.length&&<p className="muted">No events yet.</p>}
        </div>
      </section>
    </div>
  );
}
