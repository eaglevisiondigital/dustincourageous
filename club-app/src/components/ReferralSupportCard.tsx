import { FormEvent, useCallback, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

type Ticket={
  id:string;
  ticket_number:number;
  category:string;
  subject:string;
  status:string;
  created_at:string;
};

export function ReferralSupportCard({
  householdId,
  user
}:{
  householdId:string;
  user:User;
}){
  const [code,setCode]=useState("");
  const [referralCount,setReferralCount]=useState(0);
  const [tickets,setTickets]=useState<Ticket[]>([]);
  const [category,setCategory]=useState("general");
  const [subject,setSubject]=useState("");
  const [body,setBody]=useState("");
  const [working,setWorking]=useState(false);
  const [message,setMessage]=useState("");

  const load=useCallback(async()=>{
    const [codeResult,ticketResult]=await Promise.all([
      supabase.from("referral_codes").select("id,code").eq("household_id",householdId).maybeSingle(),
      supabase.from("support_tickets").select("id,ticket_number,category,subject,status,created_at").eq("household_id",householdId).order("created_at",{ascending:false}).limit(20)
    ]);

    if(codeResult.error||ticketResult.error){
      setMessage(codeResult.error?.message||ticketResult.error?.message||"Unable to load.");
      return;
    }

    setTickets((ticketResult.data??[]) as Ticket[]);

    if(codeResult.data){
      setCode(codeResult.data.code);
      const countResult=await supabase
        .from("referral_attributions")
        .select("id",{count:"exact",head:true})
        .eq("referral_code_id",codeResult.data.id);
      setReferralCount(countResult.count??0);
    }
  },[householdId]);

  useEffect(()=>{void load();},[load]);

  async function createCode(){
    setWorking(true);setMessage("");
    const {data,error}=await supabase.rpc("get_or_create_referral_code",{p_household_id:householdId});
    setWorking(false);
    if(error){setMessage(error.message);return;}
    setCode(data||"");
  }

  async function submitTicket(event:FormEvent){
    event.preventDefault();
    setWorking(true);setMessage("");
    const {error}=await supabase.from("support_tickets").insert({
      household_id:householdId,
      user_id:user.id,
      category,
      subject:subject.trim(),
      message:body.trim(),
      status:"open",
      priority:"normal"
    });
    setWorking(false);
    if(error){setMessage(error.message);return;}
    setSubject("");setBody("");
    setMessage("Support request sent.");
    await load();
  }

  return (
    <section className="referral-support-card">
      {message&&<div className="form-message">{message}</div>}

      <div className="family-detail-grid">
        <article className="family-section-card">
          <p className="eyebrow gold">Invite a Family</p>
          <h2>Adventure Club referral</h2>
          <p className="muted">Share a family referral code without sharing anyone's private account information.</p>
          {code?(
            <div className="referral-code-box">
              <strong>{code}</strong>
              <span>{referralCount} joined household{referralCount===1?"":"s"}</span>
            </div>
          ):(
            <button className="secondary-button" disabled={working} onClick={()=>void createCode()}>
              Create family referral code
            </button>
          )}
        </article>

        <article className="family-section-card">
          <p className="eyebrow red">Help</p>
          <h2>Contact Adventure Club support</h2>
          <form className="form-stack" onSubmit={submitTicket}>
            <label>
              Category
              <select value={category} onChange={(event)=>setCategory(event.target.value)}>
                <option value="general">General</option>
                <option value="account">Account</option>
                <option value="membership">Membership</option>
                <option value="billing">Billing</option>
                <option value="order">Order</option>
                <option value="technical">Technical</option>
                <option value="content">Content</option>
                <option value="safety">Safety</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label>Subject<input required value={subject} onChange={(event)=>setSubject(event.target.value)}/></label>
            <label>Message<textarea required value={body} onChange={(event)=>setBody(event.target.value)}/></label>
            <button className="primary-button" disabled={working}>Send support request</button>
          </form>
        </article>
      </div>

      {tickets.length>0&&(
        <div className="support-ticket-list">
          {tickets.map((ticket)=>(
            <article key={ticket.id}>
              <div><strong>#{ticket.ticket_number} · {ticket.subject}</strong><span>{ticket.category} · {new Date(ticket.created_at).toLocaleDateString()}</span></div>
              <span className={ticket.status==="resolved"||ticket.status==="closed"?"status-chip done":"status-chip"}>{ticket.status.replaceAll("_"," ")}</span>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
