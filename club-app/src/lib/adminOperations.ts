import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types/database";

type Ticket = Database["public"]["Tables"]["support_tickets"]["Row"];
export type TicketSnapshot = Pick<Ticket,"id"|"status"|"priority"|"updated_at"|"resolved_at">;
export async function updateSupportTicket(client:SupabaseClient<Database>,ticket:TicketSnapshot,change:{status?:string;priority?:string}) {
  if(change.status!==undefined&&!["open","in_progress","waiting_on_user","resolved","closed"].includes(change.status))throw new Error("Invalid ticket status");
  if(change.priority!==undefined&&!["low","normal","high","urgent"].includes(change.priority))throw new Error("Invalid ticket priority");
  const status=change.status??ticket.status;
  const priority=change.priority??ticket.priority;
  let resolvedAt=ticket.resolved_at;
  if(status!==ticket.status){
    if(status==="resolved")resolvedAt=new Date().toISOString();
    else if(status!=="closed")resolvedAt=null;
  }
  const {data,error}=await client.from("support_tickets").update({
    status,priority,resolved_at:resolvedAt,updated_at:new Date().toISOString()
  }).eq("id",ticket.id).eq("updated_at",ticket.updated_at)
    .eq("status",ticket.status).eq("priority",ticket.priority)
    .select("id,status,priority").single();
  if(error)throw error;
  if(data?.id!==ticket.id||data.status!==status||data.priority!==priority)throw new Error("Ticket update could not be confirmed.");
}

export type LaunchCheck=Database["public"]["Functions"]["admin_get_production_launch_gate"]["Returns"][number];
export function validatedLaunchChecks(value:unknown):LaunchCheck[]{
  if(!Array.isArray(value)||!value.length)throw new Error("Launch checks returned no results. Readiness cannot be verified.");
  const keys=new Set<string>();
  for(const row of value){
    if(!row||typeof row!=="object"||typeof row.passed!=="boolean"||
      !["blocker","warning","info"].includes(row.severity)||
      ["area","check_key","title","detail"].some(key=>typeof row[key]!=="string")||
      !row.check_key.trim()||!row.area.trim()||!row.title.trim())throw new Error("Launch checks returned an incomplete response. Readiness cannot be verified.");
    const key=JSON.stringify([row.area,row.check_key]);
    if(keys.has(key))throw new Error("Launch checks returned duplicate results. Readiness cannot be verified.");
    keys.add(key);
  }
  return value as LaunchCheck[];
}
