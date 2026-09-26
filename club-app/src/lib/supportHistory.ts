import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types/database";

export type SupportTicketDetail = Pick<Database["public"]["Tables"]["support_tickets"]["Row"],
  "id" | "household_id" | "ticket_number" | "category" | "subject" | "message" | "status" | "created_at" | "updated_at" | "resolved_at">;

export async function readSupportTicket(client: SupabaseClient<Database>, householdId: string, ticketId: string): Promise<SupportTicketDetail | null> {
  if (!householdId || !ticketId) throw new Error("Choose a family support request.");
  const { data, error } = await client.from("support_tickets")
    .select("id,household_id,ticket_number,category,subject,message,status,created_at,updated_at,resolved_at")
    .eq("household_id", householdId).eq("id", ticketId).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  if (data.id !== ticketId || data.household_id !== householdId || typeof data.message !== "string" ||
    !Number.isFinite(Date.parse(data.created_at)) || !Number.isFinite(Date.parse(data.updated_at)) ||
    (data.resolved_at !== null && !Number.isFinite(Date.parse(data.resolved_at)))) {
    throw new Error("Support request details could not be confirmed.");
  }
  return data;
}
