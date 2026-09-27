import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types/database";

export type SupportRequest = Database["public"]["Tables"]["support_tickets"]["Insert"] & { id: string; household_id: string; user_id: string };

// The caller retains this request's UUID across retries. A dropped response
// must not turn one support request into several tickets.
export async function submitSupportRequest(client: SupabaseClient<Database>, request: SupportRequest) {
  const read = () => client.from("support_tickets")
    .select("id,ticket_number").eq("id", request.id)
    .eq("household_id", request.household_id).eq("user_id", request.user_id).maybeSingle();
  const existing = await read();
  if (existing.error) throw existing.error;
  if (existing.data?.id === request.id) return existing.data;

  const inserted = await client.from("support_tickets").insert(request).select("id,ticket_number").single();
  if (!inserted.error && inserted.data?.id === request.id) return inserted.data;
  const recovered = await read();
  if (!recovered.error && recovered.data?.id === request.id) return recovered.data;
  throw new Error("Your request could not be confirmed. Retry this saved request to check again without creating a duplicate.");
}
