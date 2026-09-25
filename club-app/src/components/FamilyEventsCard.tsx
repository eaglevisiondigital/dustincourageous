import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { EventDetails } from "./EventDetails";
import { eventTimeDetails } from "../lib/eventCalendar";

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
  const [loading,setLoading]=useState(true);
  const [loadError,setLoadError]=useState("");
  const loadVersion=useRef(0);
  const actionBusy=useRef(false);

  const load=useCallback(async()=>{
    const version=++loadVersion.current;
    setLoading(true);setLoadError("");
    try {
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
    if(version!==loadVersion.current)return;
    if(error)throw error;
    setEvents((eventResult.data??[]) as EventRow[]);
    setRegistrations((registrationResult.data??[]) as Registration[]);
    } catch {
      if(version===loadVersion.current)setLoadError("Events and registrations could not be loaded. Please try again.");
    } finally {
      if(version===loadVersion.current)setLoading(false);
    }
  },[householdId]);

  useEffect(()=>{void load();return ()=>{loadVersion.current+=1;};},[load]);
  useEffect(()=>{if(selectedChildId)setChildId(selectedChildId);},[selectedChildId]);

  async function register(eventId:string){
    if(actionBusy.current||loading||loadError)return;
    actionBusy.current=true;
    setWorking(eventId);setMessage("");
    try {
    const {data,error}=await supabase.rpc("register_for_event",{
      p_event_id:eventId,
      p_household_id:householdId,
      p_child_profile_id:childId||undefined
    });
    if(error)throw error;
    if(!["registered","waitlist","attended"].includes(data??""))throw new Error("Registration status could not be confirmed.");
    setMessage(data==="waitlist"?"Added to the waitlist. A place is not yet confirmed.":data==="attended"?"Attendance is already recorded.":"Registration confirmed.");
    } catch {
      setMessage("Registration could not be confirmed. Please check the refreshed registration status before trying again.");
    } finally {
      await load();
      actionBusy.current=false;setWorking("");
    }
  }

  async function cancel(registrationId:string){
    if(actionBusy.current||loading||loadError)return;
    actionBusy.current=true;
    setWorking(registrationId);setMessage("");
    try {
    const {error}=await supabase.rpc("cancel_event_registration",{p_registration_id:registrationId});
    if(error)throw error;
    const {data,error:verifyError}=await supabase.from("event_registrations")
      .select("status").eq("id",registrationId).eq("household_id",householdId).single();
    if(verifyError||data?.status!=="canceled")throw new Error("Cancellation not confirmed");
    setMessage("Registration canceled.");
    } catch {
      setMessage("Cancellation could not be confirmed. Please check the refreshed registration status.");
    } finally {
      await load();
      actionBusy.current=false;setWorking("");
    }
  }

  return (
    <section className="family-events-card">
      <div className="section-heading">
        <div><p className="eyebrow gold">Events</p><h2>Adventure Club experiences</h2></div>
        {!loading&&!loadError&&<span className="pill">{events.length} events</span>}
      </div>

      {message&&<div className="form-message" role="status">{message}</div>}
      <button type="button" className="secondary-button event-refresh" disabled={loading||!!working} onClick={()=>void load()}>Refresh events</button>
      {loading?<p className="muted" role="status">Loading events and registrations...</p>:loadError?(
        <div><p role="alert">{loadError}</p><button type="button" className="secondary-button" disabled={!!working} onClick={()=>void load()}>Retry events</button></div>
      ):<>

      {events.length>0&&(
        <label className="event-child-selector">
          Register
          <select disabled={!!working} value={childId} onChange={(event)=>setChildId(event.target.value)}>
            <option value="">Whole family</option>
            {children.map((child)=><option key={child.id} value={child.id}>{child.display_name}</option>)}
          </select>
        </label>
      )}

      <div className="family-events-list">
        {events.map((event)=>{
          const registration=registrations.find((item)=>item.event_id===event.id&&(item.child_profile_id??"")===(childId??""));
          let time: ReturnType<typeof eventTimeDetails> | null = null;
          try { time = eventTimeDetails(event); } catch { /* Display a correction message below. */ }
          return (
            <article className="family-event-row" key={event.id}>
              <div className="event-date-box">
                <strong>{time?.month ?? "Date"}</strong>
                <span>{time?.day ?? "?"}</span>
              </div>
              <div className="family-event-copy">
                <span>{event.event_type.replaceAll("_"," ")}</span>
                <h3>{event.title}</h3>
                <p>{event.description}</p>
                <EventDetails event={event}/>
              </div>
              <div className="family-event-action">
                {registration&&registration.status!=="canceled"?(
                  <>
                    <span className={registration.status==="registered"?"status-chip done":"status-chip"}>{registration.status}</span>
                    {["registered","waitlist"].includes(registration.status)&&<button type="button" className="text-button small" disabled={!!working} onClick={()=>void cancel(registration.id)}>{working===registration.id?"Canceling...":"Cancel"}</button>}
                  </>
                ):(
                  <button type="button" className="secondary-button" disabled={!!working||!time||Date.parse(event.starts_at)<=Date.now()} onClick={()=>void register(event.id)}>
                    {working===event.id?"Saving...":!time?"Check event details":Date.parse(event.starts_at)<=Date.now()?"Registration closed":"Register"}
                  </button>
                )}
              </div>
            </article>
          );
        })}
        {!events.length&&<p className="muted">No upcoming Adventure Club events are published for this family yet.</p>}
      </div>
      </>}
    </section>
  );
}
