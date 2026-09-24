import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Lead = {
  id: string;
  lead_type: string;
  source_page: string | null;
  parent_guardian_name: string | null;
  email: string;
  child_first_name: string | null;
  child_age: number | null;
  parent_guardian_consent: boolean;
  marketing_consent: boolean;
  consent_text: string | null;
  consented_at: string | null;
  status: string;
  submission_count: number;
  last_submitted_at: string;
  created_at: string;
};

type Inquiry = {
  id: string;
  name: string;
  email: string;
  message: string;
  source_page: string | null;
  status: string;
  created_at: string;
};

type ConversionSummary = {
  lead_type: string;
  unique_leads: number;
  converted_households: number;
  conversion_percent: number;
};

type Summary = {
  record_type: string;
  category: string;
  status: string;
  record_count: number;
  latest_activity_at: string | null;
};

export function LeadsAdmin() {
  const [leads,setLeads]=useState<Lead[]>([]);
  const [inquiries,setInquiries]=useState<Inquiry[]>([]);
  const [summary,setSummary]=useState<Summary[]>([]);
  const [conversion,setConversion]=useState<ConversionSummary[]>([]);
  const [message,setMessage]=useState("");
  const [filter,setFilter]=useState<"all"|"waitlist"|"contact">("all");

  const load=useCallback(async()=>{
    setMessage("");
    const [leadResult,inquiryResult,summaryResult,conversionResult]=await Promise.all([
      supabase
        .from("marketing_leads")
        .select("id,lead_type,source_page,parent_guardian_name,email,child_first_name,child_age,parent_guardian_consent,marketing_consent,consent_text,consented_at,status,submission_count,last_submitted_at,created_at")
        .order("last_submitted_at",{ascending:false})
        .limit(250),
      supabase
        .from("contact_inquiries")
        .select("id,name,email,message,source_page,status,created_at")
        .order("created_at",{ascending:false})
        .limit(250),
      supabase
        .from("public_site_pipeline_summary")
        .select("*"),
      supabase
        .from("marketing_conversion_summary")
        .select("*")
    ]);

    const error=leadResult.error||inquiryResult.error||summaryResult.error||conversionResult.error;
    if(error){
      setMessage(error.message);
      return;
    }

    setLeads((leadResult.data??[]) as Lead[]);
    setInquiries((inquiryResult.data??[]) as Inquiry[]);
    setSummary((summaryResult.data??[]) as Summary[]);
    setConversion((conversionResult.data??[]) as ConversionSummary[]);
  },[]);

  useEffect(()=>{void load();},[load]);

  async function updateLead(id:string,status:string){
    setMessage("");
    const {error}=await supabase.from("marketing_leads").update({status}).eq("id",id);
    if(error){
      setMessage(error.message);
      return;
    }
    await load();
  }

  async function updateInquiry(id:string,status:string){
    setMessage("");
    const {error}=await supabase.from("contact_inquiries").update({status}).eq("id",id);
    if(error){
      setMessage(error.message);
      return;
    }
    await load();
  }

  const waitlistCount=summary
    .filter((row)=>row.record_type==="marketing_lead"&&row.status==="active")
    .reduce((sum,row)=>sum+Number(row.record_count||0),0);

  const convertedCount=conversion.reduce((sum,row)=>sum+Number(row.converted_households||0),0);
  const conversionPercent=conversion.length
    ? Math.round((conversion.reduce((sum,row)=>sum+Number(row.conversion_percent||0),0)/conversion.length)*10)/10
    : 0;

  const newInquiryCount=summary
    .filter((row)=>row.record_type==="contact_inquiry"&&row.status==="new")
    .reduce((sum,row)=>sum+Number(row.record_count||0),0);

  return (
    <div className="leads-admin">
      {message&&<div className="form-message">{message}</div>}

      <section className="leads-summary-grid">
        <article>
          <span>Active waitlist</span>
          <strong>{waitlistCount}</strong>
          <small>Unique guardian emails</small>
        </article>
        <article>
          <span>New inquiries</span>
          <strong>{newInquiryCount}</strong>
          <small>Needs follow-up</small>
        </article>
        <article>
          <span>Total waitlist submissions</span>
          <strong>{leads.reduce((sum,lead)=>sum+lead.submission_count,0)}</strong>
          <small>Repeat interest retained</small>
        </article>
        <article>
          <span>Converted households</span>
          <strong>{convertedCount}</strong>
          <small>{conversionPercent}% conversion</small>
        </article>
      </section>

      <nav className="kid-subnav" aria-label="Lead type">
        <button className={filter==="all"?"kid-subnav-button active":"kid-subnav-button"} onClick={()=>setFilter("all")}>All</button>
        <button className={filter==="waitlist"?"kid-subnav-button active":"kid-subnav-button"} onClick={()=>setFilter("waitlist")}>Waitlist</button>
        <button className={filter==="contact"?"kid-subnav-button active":"kid-subnav-button"} onClick={()=>setFilter("contact")}>Contact</button>
      </nav>

      {(filter==="all"||filter==="waitlist")&&(
        <section className="admin-card">
          <div className="section-heading compact-heading">
            <div>
              <p className="eyebrow gold">Adventure Club</p>
              <h2>Waitlist leads</h2>
            </div>
            <span className="pill">{leads.length} unique</span>
          </div>

          <div className="lead-record-list">
            {leads.map((lead)=>(
              <article className="lead-record" key={lead.id}>
                <div className="lead-record-main">
                  <span>{lead.lead_type.replaceAll("_"," ")}</span>
                  <h3>{lead.parent_guardian_name||"Parent / Guardian"}</h3>
                  <a href={"mailto:"+lead.email}>{lead.email}</a>
                  {(lead.child_first_name||lead.child_age!==null)&&(
                    <p>
                      Child: {lead.child_first_name||"First name not provided"}
                      {lead.child_age!==null?" · age "+lead.child_age:""}
                    </p>
                  )}
                  <small>
                    Latest {new Date(lead.last_submitted_at).toLocaleString()}
                    {lead.source_page?" · "+lead.source_page:""}
                    {lead.submission_count>1?" · "+lead.submission_count+" submissions":""}
                  </small>
                </div>

                <div className="lead-record-consent">
                  <span className={lead.marketing_consent?"status-chip done":"status-chip"}>
                    {lead.marketing_consent?"marketing consent":"no marketing consent"}
                  </span>
                  {lead.consented_at&&<small>Consented {new Date(lead.consented_at).toLocaleDateString()}</small>}
                </div>

                <select value={lead.status} onChange={(event)=>void updateLead(lead.id,event.target.value)}>
                  <option value="active">Active</option>
                  <option value="unsubscribed">Unsubscribed</option>
                  <option value="invalid">Invalid</option>
                  <option value="archived">Archived</option>
                </select>
              </article>
            ))}
            {!leads.length&&<p className="muted">No Adventure Club waitlist leads yet.</p>}
          </div>
        </section>
      )}

      {(filter==="all"||filter==="contact")&&(
        <section className="admin-card">
          <div className="section-heading compact-heading">
            <div>
              <p className="eyebrow red">Public Website</p>
              <h2>Contact inquiries</h2>
            </div>
            <span className="pill">{inquiries.length}</span>
          </div>

          <div className="lead-record-list">
            {inquiries.map((inquiry)=>(
              <article className="lead-record inquiry" key={inquiry.id}>
                <div className="lead-record-main">
                  <span>contact</span>
                  <h3>{inquiry.name}</h3>
                  <a href={"mailto:"+inquiry.email}>{inquiry.email}</a>
                  <p>{inquiry.message}</p>
                  <small>
                    {new Date(inquiry.created_at).toLocaleString()}
                    {inquiry.source_page?" · "+inquiry.source_page:""}
                  </small>
                </div>

                <select value={inquiry.status} onChange={(event)=>void updateInquiry(inquiry.id,event.target.value)}>
                  <option value="new">New</option>
                  <option value="in_progress">In progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="spam">Spam</option>
                  <option value="archived">Archived</option>
                </select>
              </article>
            ))}
            {!inquiries.length&&<p className="muted">No contact inquiries yet.</p>}
          </div>
        </section>
      )}
    </div>
  );
}
