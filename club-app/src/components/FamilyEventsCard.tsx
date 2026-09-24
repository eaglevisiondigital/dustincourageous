import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type EventRow = {
  id:string;
  title:string;
  description:string|null;
  event_type:string;
  starts_at:string;
  ends_at:string|null;
  timezone:string;
  location_name:string|null;
  location_address:string|null;
  virtual_url:string|null;
  capacity:number|null;
};

type Registration = {
  id:string;
  event_id:string;
  child_profile_id:string|null;
  status:string;
};

type Child={id:string;display_name:string};

export function FamilyEventsCard({
  householdId,
  children,
  selectedChildId
}:{
  householdId:string;
  children:Child[];
  selectedChildId:string;
}){
  const [events,setEvents]=useState<EventRow[]>([]);
  const [registrations,setRegistrations]=useState<Registration[]>([]);
  const [childId,setChildId]=useState(selectedChildId);
  const [working,setWorking]=useState("");
  const [message,setMessage]=useState("");

  const load=useCallback(async()=>{
    const [eventResult,registrationResult]=await Promise.all([
      supabase
        .from("events")
        .select("id,title,description,event_type,starts_at,ends_at,timezone,location_name,location_address,virtual_url,capacity")
        .gte("starts_at",new Date(Date.now()-24*60*60*1000).toISOString())
        .order("starts_at",{ascending:true})
        .limit(30),
      supabase
        .from("event_registrations")
        .select("id,event_id,child_profile_id,status")
        .eq("household_id",householdId)
    ]);

    const error=eventResult.error||registrationResult.error;
    if(error){setMessage(error.message);return;}
    setEvents((eventResult.data??[]) as EventRow[]);
    setRegistrations((registrationResult.data??[]) as Registration[]);
  },[householdId]);

  useEffect(()=>{void load();},[load]);
  useEffect(()=>{if(selectedChildId)setChildId(selectedChildId);},[selectedChildId]);

  async function register(eventId:string){
    setWorking(eventId);setMessage("");
    const {data,error}=await supabase.rpc("register_for_event",{
      p_event_id:eventId,
      p_household_id:householdId,
      p_child_profile_id:childId||undefined
    });
    setWorking("");
    if(error){setMessage(error.message);return;}
    setMessage(data==="waitlist"?"Added to the waitlist.":"Registration confirmed.");
    await load();
  }

  async function cancel(registrationId:string){
    setWorking(registrationId);setMessage("");
    const {error}=await supabase.rpc("cancel_event_registration",{p_registration_id:registrationId});
    setWorking("");
    if(error){setMessage(error.message);return;}
    setMessage("Registration canceled.");
    await load();
  }

  return (
    <section className="family-events-card">
      <div className="section-heading">
        <div><p className="eyebrow gold">Events</p><h2>Adventure Club experiences</h2></div>
        <span className="pill">{events.length} upcoming</span>
      </div>

      {message&&<div className="form-message">{message}</div>}

      {events.length>0&&(
        <label className="event-child-selector">
          Register
          <select value={childId} onChange={(event)=>setChildId(event.target.value)}>
            <option value="">Whole family</option>
            {children.map((child)=><option key={child.id} value={child.id}>{child.display_name}</option>)}
          </select>
        </label>
      )}

      <div className="family-events-list">
        {events.map((event)=>{
          const registration=registrations.find((item)=>item.event_id===event.id&&(item.child_profile_id??"")===(childId??""));
          return (
            <article className="family-event-row" key={event.id}>
              <div className="event-date-box">
                <strong>{new Date(event.starts_at).toLocaleDateString(undefined,{month:"short"})}</strong>
                <span>{new Date(event.starts_at).getDate()}</span>
              </div>
              <div className="family-event-copy">
                <span>{event.event_type.replaceAll("_"," ")}</span>
                <h3>{event.title}</h3>
                <p>{event.description}</p>
                <small>
                  {new Date(event.starts_at).toLocaleString()}
                  {event.location_name?" · "+event.location_name:""}
                </small>
              </div>
              <div className="family-event-action">
                {registration&&registration.status!=="canceled"?(
                  <>
                    <span className={registration.status==="registered"?"status-chip done":"status-chip"}>{registration.status}</span>
                    <button className="text-button small" disabled={working===registration.id} onClick={()=>void cancel(registration.id)}>Cancel</button>
                  </>
                ):(
                  <button className="secondary-button" disabled={working===event.id} onClick={()=>void register(event.id)}>
                    {working===event.id?"Saving...":"Register"}
                  </button>
                )}
              </div>
            </article>
          );
        })}
        {!events.length&&<p className="muted">No upcoming Adventure Club events are published for this family yet.</p>}
      </div>
    </section>
  );
}
