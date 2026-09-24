import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

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

  const load=useCallback(async()=>{
    setError("");
    const {data,error:loadError}=await supabase
      .from("orders")
      .select("id,order_number,status,total_cents,currency,created_at,order_items(id,quantity,product_name_snapshot,variant_name_snapshot,line_total_cents),fulfillments(id,status,tracking_number,tracking_url,shipped_at,delivered_at)")
      .eq("household_id",householdId)
      .order("created_at",{ascending:false})
      .limit(25);

    if(loadError){
      setError(loadError.message);
      return;
    }

    setOrders((data??[]) as Order[]);
  },[householdId]);

  useEffect(()=>{void load();},[load]);

  return (
    <section className="order-history-card">
      <div className="section-heading compact-heading">
        <div>
          <p className="eyebrow gold">Purchases</p>
          <h2>Orders & fulfillment</h2>
        </div>
        <span className="pill">{orders.length} order{orders.length===1?"":"s"}</span>
      </div>

      {error&&<div className="form-message">{error}</div>}

      {orders.length?(
        <div className="order-history-list">
          {orders.map((order)=>{
            const fulfillment=(order.fulfillments??[])[0];
            return (
              <article className="order-history-row" key={order.id}>
                <div className="order-history-main">
                  <div>
                    <strong>Order #{order.order_number}</strong>
                    <span>{new Date(order.created_at).toLocaleDateString()} · {money(order.total_cents,order.currency)}</span>
                  </div>
                  <span className={order.status==="fulfilled"?"status-chip done":"status-chip"}>{order.status.replaceAll("_"," ")}</span>
                </div>

                <div className="order-item-list">
                  {(order.order_items??[]).map((item)=>(
                    <div key={item.id}>
                      <span>{item.quantity}× {item.product_name_snapshot}{item.variant_name_snapshot?" · "+item.variant_name_snapshot:""}</span>
                      <strong>{money(item.line_total_cents,order.currency)}</strong>
                    </div>
                  ))}
                </div>

                {fulfillment&&(
                  <div className="order-fulfillment-note">
                    <span>Fulfillment: {fulfillment.status.replaceAll("_"," ")}</span>
                    {fulfillment.tracking_url?(
                      <a href={fulfillment.tracking_url} target="_blank" rel="noreferrer">Track shipment</a>
                    ):fulfillment.tracking_number?(
                      <span>Tracking {fulfillment.tracking_number}</span>
                    ):null}
                  </div>
                )}
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
