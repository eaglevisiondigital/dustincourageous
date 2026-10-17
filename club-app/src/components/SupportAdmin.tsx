import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { updateSupportTicket } from "../lib/adminOperations";

type Ticket={
  id:string;
  ticket_number:number;
  category:string;
  subject:string;
  message:string;
  status:string;
  priority:string;
  created_at:string;
  updated_at:string;
  resolved_at:string|null;
};

export function SupportAdmin(){
  const [tickets,setTickets]=useState<Ticket[]>([]);
  const [message,setMessage]=useState("");
  const [loading,setLoading]=useState(true);
  const [loadError,setLoadError]=useState("");
  const [working,setWorking]=useState(false);
  const loadVersion=useRef(0);
  const actionBusy=useRef(false);

  const load=useCallback(async()=>{
    const version=++loadVersion.current;
    setLoading(true);setLoadError("");
    try {
    const {data,error}=await supabase
      .from("support_tickets")
      .select("id,ticket_number,category,subject,message,status,priority,created_at,updated_at,resolved_at")
      .order("created_at",{ascending:false})
      .limit(200);
    if(version!==loadVersion.current)return;
    if(error)throw error;
    setTickets((data??[]) as Ticket[]);
    } catch {
      if(version===loadVersion.current)setLoadError("The support queue could not be loaded. Please try again.");
    } finally {
      if(version===loadVersion.current)setLoading(false);
    }
  },[]);

  useEffect(()=>{void load();return ()=>{loadVersion.current+=1;};},[load]);

  async function updateTicket(ticket:Ticket,change:{status?:string;priority?:string}){
    if(actionBusy.current||loading||loadError)return;
    actionBusy.current=true;setWorking(true);setMessage("");
    try {
      await updateSupportTicket(supabase,ticket,change);
      setMessage("Ticket #"+ticket.ticket_number+" updated.");
    } catch {
      setMessage("The change could not be confirmed. Another administrator may have updated this ticket. Review the refreshed queue before trying again.");
    } finally {
      await load();actionBusy.current=false;setWorking(false);
    }
  }

  return (
    <section className="admin-card">
      <div className="section-heading compact-heading">
        <div><p className="eyebrow red">Support</p><h2>Family support queue</h2></div>
        {!loading&&!loadError&&<span className="pill">{tickets.filter((t)=>!["resolved","closed"].includes(t.status)).length} open in latest {tickets.length}</span>}
      </div>
      {message&&<div className="form-message" role="status">{message}</div>}
      <button type="button" className="secondary-button" disabled={loading||working} onClick={()=>void load()}>Refresh queue</button>
      {loading?<p role="status">Loading support queue...</p>:loadError?<p role="alert">{loadError}</p>:<div className="support-admin-list">
        {tickets.map((ticket)=>(
          <article key={ticket.id}>
            <div className="support-admin-copy">
              <span>#{ticket.ticket_number} · {ticket.category} · {ticket.priority}</span>
              <h3>{ticket.subject}</h3>
              <p>{ticket.message}</p>
              <small>{new Date(ticket.created_at).toLocaleString()}</small>
            </div>
            <div className="support-admin-actions">
              <select aria-label={`Priority for ticket ${ticket.ticket_number}`} disabled={working} value={ticket.priority} onChange={(event)=>void updateTicket(ticket,{priority:event.target.value})}>
                <option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option>
              </select>
              <select aria-label={`Status for ticket ${ticket.ticket_number}`} disabled={working} value={ticket.status} onChange={(event)=>void updateTicket(ticket,{status:event.target.value})}>
                <option value="open">Open</option><option value="in_progress">In progress</option><option value="waiting_on_user">Waiting on user</option><option value="resolved">Resolved</option><option value="closed">Closed</option>
              </select>
            </div>
          </article>
        ))}
        {!tickets.length&&<p className="muted">No support tickets.</p>}
      </div>}
    </section>
  );
}
