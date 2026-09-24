import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Ticket={
  id:string;
  ticket_number:number;
  category:string;
  subject:string;
  message:string;
  status:string;
  priority:string;
  created_at:string;
};

export function SupportAdmin(){
  const [tickets,setTickets]=useState<Ticket[]>([]);
  const [message,setMessage]=useState("");

  const load=useCallback(async()=>{
    const {data,error}=await supabase
      .from("support_tickets")
      .select("id,ticket_number,category,subject,message,status,priority,created_at")
      .order("created_at",{ascending:false})
      .limit(200);
    if(error){setMessage(error.message);return;}
    setTickets((data??[]) as Ticket[]);
  },[]);

  useEffect(()=>{void load();},[load]);

  async function updateTicket(id:string,status:string,priority?:string){
    const payload = {
      status,
      ...(priority ? { priority } : {}),
      ...(status === "resolved" ? { resolved_at: new Date().toISOString() } : {})
    };
    const {error}=await supabase.from("support_tickets").update(payload).eq("id",id);
    if(error){setMessage(error.message);return;}
    await load();
  }

  return (
    <section className="admin-card">
      <div className="section-heading compact-heading">
        <div><p className="eyebrow red">Support</p><h2>Family support queue</h2></div>
        <span className="pill">{tickets.filter((t)=>!["resolved","closed"].includes(t.status)).length} open</span>
      </div>
      {message&&<div className="form-message">{message}</div>}
      <div className="support-admin-list">
        {tickets.map((ticket)=>(
          <article key={ticket.id}>
            <div className="support-admin-copy">
              <span>#{ticket.ticket_number} · {ticket.category} · {ticket.priority}</span>
              <h3>{ticket.subject}</h3>
              <p>{ticket.message}</p>
              <small>{new Date(ticket.created_at).toLocaleString()}</small>
            </div>
            <div className="support-admin-actions">
              <select value={ticket.priority} onChange={(event)=>void updateTicket(ticket.id,ticket.status,event.target.value)}>
                <option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option>
              </select>
              <select value={ticket.status} onChange={(event)=>void updateTicket(ticket.id,event.target.value)}>
                <option value="open">Open</option><option value="in_progress">In progress</option><option value="waiting_on_user">Waiting on user</option><option value="resolved">Resolved</option><option value="closed">Closed</option>
              </select>
            </div>
          </article>
        ))}
        {!tickets.length&&<p className="muted">No support tickets.</p>}
      </div>
    </section>
  );
}
