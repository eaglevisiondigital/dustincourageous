import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

type Snapshot = {
  active_households: number;
  active_child_profiles: number;
  active_subscriptions: number;
  active_organizations: number;
  active_groups: number;
  challenges_completed_all_time: number;
  verses_memorized_all_time: number;
  books_completed_all_time: number;
  rewards_unlocked_all_time: number;
  open_support_tickets: number;
  open_privacy_requests: number;
  queued_external_notifications: number;
};

type Metric = {
  metric_date: string;
  new_households: number;
  new_child_profiles: number;
  challenges_completed: number;
  verses_memorized: number;
  books_completed: number;
  family_faith_sessions: number;
  event_registrations: number;
  referrals_attributed: number;
  paid_orders: number;
  gross_revenue_cents: number;
};

type PrivacyRequest = {
  id: string;
  request_type: string;
  status: string;
  reason: string | null;
  created_at: string;
  household_id: string;
  child_profile_id: string | null;
};

type Delivery = {
  id: string;
  channel: string;
  status: string;
  attempt_count: number;
  next_attempt_at: string;
  created_at: string;
  user_notifications:
    | { title: string; notification_type: string }
    | { title: string; notification_type: string }[]
    | null;
};

function firstRelation<T>(value:T|T[]|null):T|null{
  return Array.isArray(value)?value[0]??null:value;
}

function money(cents:number){
  return new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(cents/100);
}

export function AnalyticsPrivacyAdmin({ role }: { role: string }) {
  const [snapshot,setSnapshot]=useState<Snapshot|null>(null);
  const [metrics,setMetrics]=useState<Metric[]>([]);
  const [privacy,setPrivacy]=useState<PrivacyRequest[]>([]);
  const [deliveries,setDeliveries]=useState<Delivery[]>([]);
  const [days,setDays]=useState(30);
  const [message,setMessage]=useState("");
  const [working,setWorking]=useState("");

  const canManagePrivacy=["super_admin","operations_admin","support_admin"].includes(role);

  const load=useCallback(async()=>{
    setMessage("");

    const [snapshotResult,metricResult,privacyResult,deliveryResult]=await Promise.all([
      supabase.rpc("admin_get_platform_snapshot"),
      supabase.rpc("admin_get_daily_metrics",{p_days:days}),
      supabase
        .from("data_privacy_requests")
        .select("id,request_type,status,reason,created_at,household_id,child_profile_id")
        .order("created_at",{ascending:false})
        .limit(100),
      supabase
        .from("notification_deliveries")
        .select("id,channel,status,attempt_count,next_attempt_at,created_at,user_notifications(title,notification_type)")
        .order("created_at",{ascending:false})
        .limit(100)
    ]);

    const error=snapshotResult.error||metricResult.error||privacyResult.error||deliveryResult.error;
    if(error){
      setMessage(error.message);
      return;
    }

    setSnapshot((((snapshotResult.data??[]) as Snapshot[])[0]??null));
    setMetrics((metricResult.data??[]) as Metric[]);
    setPrivacy((privacyResult.data??[]) as PrivacyRequest[]);
    setDeliveries((deliveryResult.data??[]) as Delivery[]);
  },[days]);

  useEffect(()=>{void load();},[load]);

  const totals=useMemo(()=>metrics.reduce((acc,item)=>({
    households:acc.households+Number(item.new_households||0),
    children:acc.children+Number(item.new_child_profiles||0),
    challenges:acc.challenges+Number(item.challenges_completed||0),
    scriptures:acc.scriptures+Number(item.verses_memorized||0),
    books:acc.books+Number(item.books_completed||0),
    familyFaith:acc.familyFaith+Number(item.family_faith_sessions||0),
    referrals:acc.referrals+Number(item.referrals_attributed||0),
    events:acc.events+Number(item.event_registrations||0),
    orders:acc.orders+Number(item.paid_orders||0),
    revenue:acc.revenue+Number(item.gross_revenue_cents||0)
  }),{households:0,children:0,challenges:0,scriptures:0,books:0,familyFaith:0,referrals:0,events:0,orders:0,revenue:0}),[metrics]);

  async function updatePrivacy(id:string,status:string){
    if(!canManagePrivacy)return;
    setWorking(id);setMessage("");

    const payload={
      status,
      ...(status==="in_review"?{reviewed_at:new Date().toISOString()}:{}),
      ...(status==="completed"?{completed_at:new Date().toISOString()}:{}),
      ...(status==="rejected"?{reviewed_at:new Date().toISOString()}: {})
    };

    const {error}=await supabase.from("data_privacy_requests").update(payload).eq("id",id);
    setWorking("");
    if(error){setMessage(error.message);return;}
    await load();
  }

  return (
    <div className="analytics-privacy-admin">
      {message&&<div className="form-message">{message}</div>}

      <section className="analytics-snapshot">
        <div className="section-heading">
          <div>
            <p className="eyebrow gold">Platform Snapshot</p>
            <h2>Adventure Club operating picture</h2>
          </div>
          <span className="pill">Aggregate only</span>
        </div>

        <div className="analytics-snapshot-grid">
          <article><strong>{snapshot?.active_households??0}</strong><span>Active households</span></article>
          <article><strong>{snapshot?.active_child_profiles??0}</strong><span>Active child profiles</span></article>
          <article><strong>{snapshot?.active_organizations??0}</strong><span>Organizations</span></article>
          <article><strong>{snapshot?.active_groups??0}</strong><span>Groups</span></article>
          <article><strong>{snapshot?.challenges_completed_all_time??0}</strong><span>Challenges completed</span></article>
          <article><strong>{snapshot?.verses_memorized_all_time??0}</strong><span>Verses memorized</span></article>
          <article><strong>{snapshot?.open_support_tickets??0}</strong><span>Open support</span></article>
          <article><strong>{snapshot?.open_privacy_requests??0}</strong><span>Privacy requests</span></article>
        </div>
      </section>

      <section className="admin-card">
        <div className="section-heading compact-heading">
          <div>
            <p className="eyebrow red">Engagement</p>
            <h2>Recent activity</h2>
          </div>
          <select value={days} onChange={(event)=>setDays(Number(event.target.value))}>
            <option value={7}>7 days</option>
            <option value={30}>30 days</option>
            <option value={90}>90 days</option>
            <option value={180}>180 days</option>
          </select>
        </div>

        <div className="analytics-period-grid">
          <article><strong>{totals.households}</strong><span>New households</span></article>
          <article><strong>{totals.children}</strong><span>New child profiles</span></article>
          <article><strong>{totals.challenges}</strong><span>Challenges</span></article>
          <article><strong>{totals.scriptures}</strong><span>Verses memorized</span></article>
          <article><strong>{totals.familyFaith}</strong><span>Family Faith sessions</span></article>
          <article><strong>{totals.events}</strong><span>Event registrations</span></article>
          <article><strong>{totals.referrals}</strong><span>Referrals</span></article>
          <article><strong>{money(totals.revenue)}</strong><span>Gross paid orders</span></article>
        </div>

        <div className="analytics-daily-table">
          <div className="analytics-daily-head">
            <span>Date</span><span>Homes</span><span>Challenges</span><span>Verses</span><span>Faith At Home</span><span>Events</span>
          </div>
          {metrics.slice().reverse().slice(0,14).map((item)=>(
            <div key={item.metric_date}>
              <strong>{new Date(item.metric_date+"T12:00:00").toLocaleDateString()}</strong>
              <span>{item.new_households}</span>
              <span>{item.challenges_completed}</span>
              <span>{item.verses_memorized}</span>
              <span>{item.family_faith_sessions}</span>
              <span>{item.event_registrations}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="admin-two-column">
        <article className="admin-card">
          <div className="section-heading compact-heading">
            <div><p className="eyebrow red">Privacy Operations</p><h2>Guardian requests</h2></div>
            <span className="pill">{privacy.filter((item)=>!["completed","canceled","rejected"].includes(item.status)).length} open</span>
          </div>

          <div className="admin-list">
            {privacy.map((item)=>(
              <div className="privacy-admin-row" key={item.id}>
                <div>
                  <strong>{item.request_type.replaceAll("_"," ")}</strong>
                  <small>{new Date(item.created_at).toLocaleString()}</small>
                  {item.reason&&<p>{item.reason}</p>}
                </div>
                {canManagePrivacy?(
                  <select disabled={working===item.id} value={item.status} onChange={(event)=>void updatePrivacy(item.id,event.target.value)}>
                    <option value="requested">Requested</option>
                    <option value="identity_confirmed">Identity confirmed</option>
                    <option value="in_review">In review</option>
                    <option value="ready">Ready</option>
                    <option value="completed">Completed</option>
                    <option value="rejected">Rejected</option>
                  </select>
                ):(
                  <span className="status-chip">{item.status.replaceAll("_"," ")}</span>
                )}
              </div>
            ))}
            {!privacy.length&&<p className="muted">No privacy requests yet.</p>}
          </div>
        </article>

        <article className="admin-card">
          <div className="section-heading compact-heading">
            <div><p className="eyebrow gold">Notification Queue</p><h2>External delivery readiness</h2></div>
            <span className="pill">{snapshot?.queued_external_notifications??0} queued</span>
          </div>

          <p className="muted">Email and push rows queue now according to guardian preferences. They stay queued until an actual provider or GoodBarber push connector is configured.</p>

          <div className="admin-list">
            {deliveries.slice(0,20).map((item)=>{
              const notification=firstRelation(item.user_notifications);
              return (
                <div className="notification-delivery-row" key={item.id}>
                  <div>
                    <strong>{notification?.title||"Notification"}</strong>
                    <small>{item.channel} · {notification?.notification_type?.replaceAll("_"," ")}</small>
                  </div>
                  <span className={item.status==="sent"?"status-chip done":"status-chip"}>{item.status}</span>
                </div>
              );
            })}
            {!deliveries.length&&<p className="muted">No external delivery rows yet.</p>}
          </div>
        </article>
      </section>
    </div>
  );
}
