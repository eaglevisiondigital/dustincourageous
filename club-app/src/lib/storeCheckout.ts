import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types/database";

type Membership = Database["public"]["Views"]["household_membership_summary"]["Row"];

export function hasCurrentMemberPricing(
  membership: Pick<Membership, "plan_key" | "subscription_status" | "current_period_end"> | null,
  now = Date.now()
) {
  return !!membership?.plan_key && membership.plan_key !== "free" &&
    ["active", "trialing", "comped"].includes(membership.subscription_status ?? "") &&
    (membership.current_period_end === null || Date.parse(membership.current_period_end) > now);
}

export function secureExternalUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password ? url.href : null;
  } catch {
    return null;
  }
}

export async function prepareHostedCheckout(
  client: SupabaseClient<Database>,
  sessionId: string,
  remember: (sessionId: string) => void
) {
  // Save recovery information before a provider request can reach the network.
  remember(sessionId);
  const { data, error } = await client.functions.invoke("commerce-checkout", {
    body: { checkout_session_id: sessionId }
  });
  if (error || data?.error) throw new Error("Checkout could not be confirmed. Check your order status before trying again.");
  const url = secureExternalUrl(data?.checkout_url);
  if (!url) throw new Error("A secure payment page was not returned. Check your order status before trying again.");
  return url;
}
