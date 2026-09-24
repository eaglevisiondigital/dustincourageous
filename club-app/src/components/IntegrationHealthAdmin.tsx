import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Provider = {
  id: string;
  provider_key: string;
  provider_type: string;
  display_name: string;
  status: string;
  health_status: string;
  last_health_check_at: string | null;
  last_success_at: string | null;
  last_error_at: string | null;
  last_error: string | null;
  failed_events_24h: number;
  successful_events_24h: number;
};

type DeliveryHealth = {
  channel: string;
  status: string;
  delivery_count: number;
  delivery_count_24h: number;
  last_sent_at: string | null;
  last_updated_at: string | null;
};

type WorkerHealth = {
  worker_key: string;
  last_started_at: string | null;
  last_completed_at: string | null;
  last_status: string | null;
  last_claimed_count: number | null;
  last_sent_count: number | null;
  last_failed_count: number | null;
  last_suppressed_count: number | null;
};

type CommerceReadiness = {
  active_products: number;
  product_drafts_needing_governance: number;
  approved_products_ready_to_activate: number;
  open_checkouts: number;
  paid_orders_24h: number;
  webhook_failures_24h: number;
  stale_pending_orders: number;
  provider_status: string | null;
  provider_health: string | null;
  provider_last_success_at: string | null;
  provider_last_error: string | null;
};

type CommerceWebhook = {
  id: string;
  provider: string;
  provider_event_id: string;
  event_type: string | null;
  order_id: string | null;
  status: string;
  error_message: string | null;
  received_at: string;
  processed_at: string | null;
};

type AppChannel = {
  app_channel: string;
  platform: string | null;
  active_installations: number;
  push_ready_installations: number;
  last_seen_at: string | null;
};

export function IntegrationHealthAdmin() {
  const [providers,setProviders]=useState<Provider[]>([]);
  const [deliveries,setDeliveries]=useState<DeliveryHealth[]>([]);
  const [workers,setWorkers]=useState<WorkerHealth[]>([]);
  const [channels,setChannels]=useState<AppChannel[]>([]);
  const [runs,setRuns]=useState<any[]>([]);
  const [commerce,setCommerce]=useState<CommerceReadiness|null>(null);
  const [commerceWebhooks,setCommerceWebhooks]=useState<CommerceWebhook[]>([]);
  const [message,setMessage]=useState("");

  const load=useCallback(async()=>{
    setMessage("");

    const [providerResult,deliveryResult,workerResult,channelResult,runResult,commerceResult,webhookResult]=await Promise.all([
      supabase.from("integration_health_summary").select("*").order("provider_type"),
      supabase.from("notification_delivery_health").select("*").order("channel").order("status"),
      supabase.from("delivery_worker_health").select("*").order("worker_key"),
      supabase.from("app_channel_health").select("*").order("app_channel"),
      supabase
        .from("delivery_worker_runs")
        .select("id,worker_key,started_at,completed_at,status,claimed_count,sent_count,failed_count,suppressed_count,error_message")
        .order("started_at",{ascending:false})
        .limit(12),
      supabase
        .from("commerce_readiness_summary")
        .select("*")
        .maybeSingle(),
      supabase
        .from("commerce_recent_webhooks")
        .select("*")
        .limit(12)
    ]);

    const error=
      providerResult.error||
      deliveryResult.error||
      workerResult.error||
      channelResult.error||
      runResult.error||
      commerceResult.error||
      webhookResult.error;
    if(error){
      setMessage(error.message);
      return;
    }

    setProviders((providerResult.data??[]) as Provider[]);
    setDeliveries((deliveryResult.data??[]) as DeliveryHealth[]);
    setWorkers((workerResult.data??[]) as WorkerHealth[]);
    setChannels((channelResult.data??[]) as AppChannel[]);
    setRuns(runResult.data??[]);
    setCommerce((commerceResult.data??null) as CommerceReadiness|null);
    setCommerceWebhooks((webhookResult.data??[]) as CommerceWebhook[]);
  },[]);

  useEffect(()=>{void load();},[load]);

  return (
    <div className="integration-health-admin">
      {message&&<div className="form-message">{message}</div>}

      <section className="integration-health-hero">
        <div>
          <p className="eyebrow gold">Production Delivery</p>
          <h2>Integrations & Delivery Health</h2>
          <p>
            Supabase remains the source of truth. Email, push, GoodBarber, and future native delivery providers attach here without owning family data or permissions.
          </p>
        </div>
        <button className="secondary-button" type="button" onClick={()=>void load()}>Refresh health</button>
      </section>

      <div className="integration-provider-grid">
        {providers.map((provider)=>(
          <article key={provider.id}>
            <div className="integration-provider-head">
              <div>
                <span>{provider.provider_type.replaceAll("_"," ")}</span>
                <h3>{provider.display_name}</h3>
              </div>
              <span className={provider.health_status==="healthy"?"status-chip done":"status-chip"}>
                {provider.status.replaceAll("_"," ")}
              </span>
            </div>
            <dl>
              <div><dt>Health</dt><dd>{provider.health_status}</dd></div>
              <div><dt>Success 24h</dt><dd>{provider.successful_events_24h}</dd></div>
              <div><dt>Failures 24h</dt><dd>{provider.failed_events_24h}</dd></div>
              <div><dt>Last success</dt><dd>{provider.last_success_at?new Date(provider.last_success_at).toLocaleString():"Never"}</dd></div>
            </dl>
            {provider.last_error&&<p className="integration-error">{provider.last_error}</p>}
          </article>
        ))}
      </div>

      <div className="admin-two-column">
        <section className="admin-card">
          <div className="section-heading compact-heading">
            <div><p className="eyebrow red">Delivery Queue</p><h2>Email & push</h2></div>
          </div>
          <div className="admin-list">
            {deliveries.map((row)=>(
              <article className="admin-list-row" key={row.channel+":"+row.status}>
                <div>
                  <strong>{row.channel} · {row.status}</strong>
                  <small>{row.delivery_count} total · {row.delivery_count_24h} in 24h</small>
                </div>
                <span className={row.status==="sent"?"status-chip done":"status-chip"}>{row.delivery_count}</span>
              </article>
            ))}
            {!deliveries.length&&<p className="muted">No delivery records yet.</p>}
          </div>
        </section>

        <section className="admin-card">
          <div className="section-heading compact-heading">
            <div><p className="eyebrow gold">App Channels</p><h2>Installations</h2></div>
          </div>
          <div className="admin-list">
            {channels.map((row)=>(
              <article className="admin-list-row" key={row.app_channel+":"+String(row.platform)}>
                <div>
                  <strong>{row.app_channel.replaceAll("_"," ")}</strong>
                  <small>{row.platform||"unknown platform"} · last seen {row.last_seen_at?new Date(row.last_seen_at).toLocaleString():"never"}</small>
                </div>
                <span className="status-chip done">{row.active_installations} active · {row.push_ready_installations} push</span>
              </article>
            ))}
            {!channels.length&&<p className="muted">No app installations have registered yet.</p>}
          </div>
        </section>
      </div>

      <section className="admin-card">
        <div className="section-heading compact-heading">
          <div><p className="eyebrow red">Worker</p><h2>Notification delivery worker</h2></div>
        </div>

        {workers.map((worker)=>(
          <div className="worker-health-strip" key={worker.worker_key}>
            <div><span>Status</span><strong>{worker.last_status||"never run"}</strong></div>
            <div><span>Claimed</span><strong>{worker.last_claimed_count??0}</strong></div>
            <div><span>Sent</span><strong>{worker.last_sent_count??0}</strong></div>
            <div><span>Failed</span><strong>{worker.last_failed_count??0}</strong></div>
            <div><span>Suppressed</span><strong>{worker.last_suppressed_count??0}</strong></div>
          </div>
        ))}

        {!workers.length&&(
          <p className="muted">
            The delivery worker is deployed, but it has not been invoked yet. Email/push credentials are intentionally not configured yet.
          </p>
        )}

        {runs.length>0&&(
          <div className="worker-run-list">
            {runs.map((run)=>(
              <article key={run.id}>
                <div>
                  <strong>{run.worker_key}</strong>
                  <small>{new Date(run.started_at).toLocaleString()}</small>
                </div>
                <span className={run.status==="succeeded"?"status-chip done":"status-chip"}>{run.status}</span>
                <small>{run.sent_count} sent · {run.failed_count} failed · {run.suppressed_count} suppressed</small>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="admin-card commerce-readiness-card">
        <div className="section-heading compact-heading">
          <div>
            <p className="eyebrow gold">Commerce Readiness</p>
            <h2>Hosted checkout health</h2>
          </div>
          <span className={commerce?.provider_health==="healthy"?"status-chip done":"status-chip"}>
            {commerce?.provider_status?.replaceAll("_"," ")||"not configured"}
          </span>
        </div>

        {commerce&&(
          <>
            <div className="commerce-readiness-grid">
              <div><span>Active products</span><strong>{commerce.active_products}</strong></div>
              <div><span>Needs DC review</span><strong>{commerce.product_drafts_needing_governance}</strong></div>
              <div><span>Approved to activate</span><strong>{commerce.approved_products_ready_to_activate}</strong></div>
              <div><span>Open checkouts</span><strong>{commerce.open_checkouts}</strong></div>
              <div><span>Paid orders 24h</span><strong>{commerce.paid_orders_24h}</strong></div>
              <div><span>Webhook failures 24h</span><strong>{commerce.webhook_failures_24h}</strong></div>
              <div><span>Stale pending</span><strong>{commerce.stale_pending_orders}</strong></div>
              <div><span>Provider health</span><strong>{commerce.provider_health||"unknown"}</strong></div>
            </div>

            {commerce.provider_last_error&&(
              <p className="integration-error">{commerce.provider_last_error}</p>
            )}

            <p className="privacy-note">
              Adventure Club creates the authoritative order and never collects raw card data. The configured hosted payment adapter handles payment and returns only payment/shipping confirmation to Dustin Supabase.
            </p>
          </>
        )}

        {commerceWebhooks.length>0&&(
          <div className="commerce-webhook-list">
            {commerceWebhooks.map((event)=>(
              <article key={event.id}>
                <div>
                  <strong>{event.event_type||"payment event"}</strong>
                  <small>{event.provider} · {new Date(event.received_at).toLocaleString()}</small>
                </div>
                <span className={event.status==="processed"?"status-chip done":"status-chip"}>{event.status}</span>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="admin-card integration-next-steps">
        <p className="eyebrow gold">Provider Configuration</p>
        <h2>What remains before real outbound delivery</h2>
        <p>
          Email and push adapters are ready but intentionally inactive until credentials are approved. Email currently supports a Resend adapter when configured. Push uses a provider-neutral webhook contract, so GoodBarber or another native provider can be connected without changing Adventure Club data ownership.
        </p>
      </section>
    </div>
  );
}
