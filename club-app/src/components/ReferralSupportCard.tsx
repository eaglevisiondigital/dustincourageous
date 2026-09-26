import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { submitSupportRequest, type SupportRequest } from "../lib/supportTicket";
import { SupportTicketDetails } from "./SupportTicketDetails";

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
  const [referralCount,setReferralCount]=useState<number|null>(null);
  const [tickets,setTickets]=useState<Ticket[]>([]);
  const [category,setCategory]=useState("general");
  const [subject,setSubject]=useState("");
  const [body,setBody]=useState("");
  const [working,setWorking]=useState(false);
  const [message,setMessage]=useState("");
  const [loading,setLoading]=useState(true);
  const [loadError,setLoadError]=useState("");
  const [pendingRequest,setPendingRequest]=useState<SupportRequest|null>(null);
  const [copyFallback,setCopyFallback]=useState("");
  const [openTicket,setOpenTicket]=useState<string|null>(null);
  const actionBusy=useRef(false);
  const loadVersion=useRef(0);

  const load=useCallback(async()=>{
    const version=++loadVersion.current;
    setLoading(true);setLoadError("");setReferralCount(null);
    try {
    const [codeResult,ticketResult]=await Promise.all([
      supabase.from("referral_codes").select("id,code").eq("household_id",householdId).maybeSingle(),
      supabase.from("support_tickets").select("id,ticket_number,category,subject,status,created_at").eq("household_id",householdId).order("created_at",{ascending:false}).limit(20)
    ]);

    if(version!==loadVersion.current)return;
    if(codeResult.error||ticketResult.error)throw codeResult.error||ticketResult.error;

    setTickets((ticketResult.data??[]) as Ticket[]);

    setCode(codeResult.data?.code??"");
    if(codeResult.data){
      const countResult=await supabase
        .from("referral_attributions")
        .select("id",{count:"exact",head:true})
        .eq("referral_code_id",codeResult.data.id);
      if(version!==loadVersion.current)return;
      if(countResult.error)throw countResult.error;
      setReferralCount(countResult.count);
    }
    } catch {
      if(version===loadVersion.current)setLoadError("Referral and support history could not be fully loaded. Please try again.");
    } finally {
      if(version===loadVersion.current)setLoading(false);
    }
  },[householdId]);

  useEffect(()=>{void load();return ()=>{loadVersion.current+=1;};},[load]);

  async function createCode(){
    if(actionBusy.current||loading||loadError)return;
    actionBusy.current=true;
    setWorking(true);setMessage("");
    try {
    const {data,error}=await supabase.rpc("get_or_create_referral_code",{p_household_id:householdId});
    if(error||!data)throw error||new Error("Code not returned");
    setCode(data);await load();
    } catch {
      setMessage("Your referral code could not be confirmed. Refresh the details before trying again.");
    } finally {
      actionBusy.current=false;setWorking(false);
    }
  }

  async function copyReferral(){
    const link=window.location.origin+"/?ref="+encodeURIComponent(code);
    setCopyFallback("");
    try {
      if(!navigator.clipboard)throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(link);
      setMessage("Referral link copied.");
    } catch {
      setCopyFallback(link);
      setMessage("Automatic copying is unavailable. Select and copy the link below.");
    }
  }

  async function submitTicket(event:FormEvent){
    event.preventDefault();
    if(actionBusy.current)return;
    if(!pendingRequest&&(!subject.trim()||!body.trim())){setMessage("Enter a subject and message before sending.");return;}
    actionBusy.current=true;
    setWorking(true);setMessage("");
    try {
    const request=pendingRequest??{
      id:crypto.randomUUID(),
      household_id:householdId,
      user_id:user.id,
      category,
      subject:subject.trim(),
      message:body.trim(),
      status:"open",
      priority:"normal"
    };
    setPendingRequest(request);
    const ticket=await submitSupportRequest(supabase,request);
    setPendingRequest(null);
    setSubject("");setBody("");
    setMessage("Support request #"+ticket.ticket_number+" sent.");
    await load();
    } catch {
      setMessage("Your request could not be confirmed. Retry the saved request below. Your message is preserved and the same ticket identifier will be reused.");
    } finally {
      actionBusy.current=false;setWorking(false);
    }
  }

  return (
    <section className="referral-support-card">
      {message&&<div className="form-message" role="status">{message}</div>}
      {loadError&&<div><p role="alert">{loadError}</p><button type="button" className="secondary-button" disabled={working||loading} onClick={()=>void load()}>Retry Details</button></div>}

      <div className="family-detail-grid">
        <article className="family-section-card">
          <p className="eyebrow gold">Invite A Family</p>
          <h2>Adventure Club Referral</h2>
          <p className="muted">Share a family referral code without sharing anyone's private account information.</p>
          {loading?<p role="status">Loading referral details...</p>:code?(
            <div className="referral-code-box">
              <strong>{code}</strong>
              <span>{referralCount===null?"Referral count unavailable":`${referralCount} joined household${referralCount===1?"":"s"}`}</span>
              <button
                type="button"
                className="text-button small"
                onClick={() => void copyReferral()}
              >
                Copy Referral Link
              </button>
              {copyFallback&&<label>Referral Link<input readOnly value={copyFallback} onFocus={event=>event.target.select()}/></label>}
            </div>
          ):(
            <button type="button" className="secondary-button" disabled={working||!!loadError} onClick={()=>void createCode()}>
              Create Family Referral Code
            </button>
          )}
        </article>

        <article className="family-section-card">
          <p className="eyebrow red">Help</p>
          <h2>Contact Adventure Club Support</h2>
          <form className="form-stack" onSubmit={submitTicket}>
            <label>
              Category
              <select disabled={working||!!pendingRequest} value={category} onChange={(event)=>setCategory(event.target.value)}>
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
            <label>Subject<input required disabled={working||!!pendingRequest} value={subject} onChange={(event)=>setSubject(event.target.value)}/></label>
            <label>Message<textarea required disabled={working||!!pendingRequest} value={body} onChange={(event)=>setBody(event.target.value)}/></label>
            <button className="primary-button" disabled={working}>{working?"Checking request...":pendingRequest?"Retry Saved Request":"Send Support Request"}</button>
          </form>
        </article>
      </div>

      <button type="button" className="secondary-button support-history-refresh" disabled={loading||working} onClick={()=>void load()}>Refresh Support History</button>
      {loading?<p role="status">Loading support history...</p>:loadError?null:tickets.length>0?(
        <div className="support-ticket-list">
          {tickets.map((ticket)=>(
            <article key={ticket.id}>
              <div><strong>#{ticket.ticket_number} · {ticket.subject}</strong><span>{ticket.category} · {new Date(ticket.created_at).toLocaleDateString()}</span></div>
              <span className={ticket.status==="resolved"||ticket.status==="closed"?"status-chip done":"status-chip"}>{ticket.status.replaceAll("_"," ")}</span>
              <button type="button" className="secondary-button" aria-label={`View support request ${ticket.ticket_number}`} onClick={()=>setOpenTicket(ticket.id)}>View Request</button>
            </article>
          ))}
        </div>
      ):<p className="muted">No support requests are connected to this family yet.</p>}
      {openTicket&&<SupportTicketDetails key={`${householdId}:${openTicket}`} householdId={householdId} ticketId={openTicket} onClose={()=>setOpenTicket(null)}/>}
    </section>
  );
}
