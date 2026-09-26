import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { secureExternalUrl } from "../lib/storeCheckout";

type Order = {
  id: string;
  order_number: number;
  status: string;
  total_cents: number;
  currency: string;
  created_at: string;
  order_items:
    | {
        id: string;
        quantity: number;
        product_name_snapshot: string;
        variant_name_snapshot: string | null;
        line_total_cents: number;
      }[]
    | null;
  fulfillments:
    | {
        id: string;
        status: string;
        tracking_number: string | null;
        tracking_url: string | null;
        shipped_at: string | null;
        delivered_at: string | null;
      }[]
    | null;
};

function money(cents:number,currency:string){
  return new Intl.NumberFormat("en-US",{style:"currency",currency:currency||"USD"}).format(cents/100);
}

export function OrderHistoryCard({ householdId }: { householdId: string }) {
  const [orders,setOrders]=useState<Order[]>([]);
  const [error,setError]=useState("");
  const [refreshing,setRefreshing]=useState(true);
  const loadVersion=useRef(0);

  const load=useCallback(async()=>{
    const version=++loadVersion.current;
    setRefreshing(true);
    setError("");
    setOrders([]);
    try {
    const {data,error:loadError}=await supabase
      .from("orders")
      .select("id,order_number,status,total_cents,currency,created_at,order_items(id,quantity,product_name_snapshot,variant_name_snapshot,line_total_cents),fulfillments(id,status,tracking_number,tracking_url,shipped_at,delivered_at)")
      .eq("household_id",householdId)
      .order("created_at",{ascending:false})
      .limit(25);

    if(version!==loadVersion.current)return;
    if(loadError)throw loadError;
    setOrders((data??[]) as Order[]);
    } catch {
      if(version===loadVersion.current)setError("Your orders could not be loaded. Please refresh to try again.");
    } finally {
      if(version===loadVersion.current)setRefreshing(false);
    }
  },[householdId]);

  useEffect(()=>{void load();return ()=>{loadVersion.current+=1;};},[load]);

  return (
    <section className="order-history-card">
      <div className="section-heading compact-heading">
        <div>
          <p className="eyebrow gold">Purchases</p>
          <h2>Orders & Fulfillment</h2>
        </div>
        <button className="secondary-button" type="button" disabled={refreshing} onClick={()=>void load()}>
          {refreshing?"Checking...":"Refresh Orders"}
        </button>
      </div>

      {error&&<div className="form-message" role="alert">{error}</div>}
      {refreshing?<p className="muted" role="status">Loading your orders...</p>:error?null:orders.length?(
        <div className="order-history-list">
          {orders.map((order)=>{
            return (
              <article className="order-history-row" key={order.id}>
                <div className="order-history-main">
                  <div>
                    <strong>Order #{order.order_number}</strong>
                    <span>{new Date(order.created_at).toLocaleDateString()} · {money(order.total_cents,order.currency)}</span>
                  </div>
                  <span className={["paid","fulfilled","partially_fulfilled"].includes(order.status)?"status-chip done":"status-chip"}>
                    {order.status==="pending_payment"?"Payment pending":order.status==="draft"?"Checkout started":order.status.replaceAll("_"," ")}
                  </span>
                </div>

                <div className="order-item-list">
                  {(order.order_items??[]).map((item)=>(
                    <div key={item.id}>
                      <span>{item.quantity}× {item.product_name_snapshot}{item.variant_name_snapshot?" · "+item.variant_name_snapshot:""}</span>
                      <strong>{money(item.line_total_cents,order.currency)}</strong>
                    </div>
                  ))}
                </div>

                {(order.fulfillments??[]).map((fulfillment)=>{
                  const trackingUrl=secureExternalUrl(fulfillment.tracking_url);
                  return <div className="order-fulfillment-note" key={fulfillment.id}>
                    <span>Fulfillment: {fulfillment.status.replaceAll("_"," ")}</span>
                    {trackingUrl?(
                      <a href={trackingUrl} target="_blank" rel="noopener noreferrer">Track Shipment</a>
                    ):fulfillment.tracking_number?(
                      <span>Tracking {fulfillment.tracking_number}</span>
                    ):null}
                  </div>;
                })}
              </article>
            );
          })}
        </div>
      ):(
        <p className="muted">No Dustin Courageous orders are connected to this family yet.</p>
      )}
    </section>
  );
}
