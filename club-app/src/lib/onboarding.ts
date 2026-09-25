import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types/database";

export function childProfileInput(name: string, year: string, consent: boolean, currentYear = new Date().getFullYear()) {
  if (!consent) throw new Error("Please confirm guardian approval for this child to participate in Adventure Club.");
  const displayName = name.trim();
  if (!displayName) throw new Error("Enter your child's first name or nickname.");
  const value = year.trim();
  if (value && (!/^\d{4}$/.test(value) || Number(value) < 2008 || Number(value) > currentYear)) {
    throw new Error(`Enter a birth year from 2008 through ${currentYear}, or leave it blank.`);
  }
  return { p_display_name: displayName, p_birth_year: value ? Number(value) : undefined };
}

export function householdInput(name: string, consent: boolean, timezone: string) {
  if (!consent) throw new Error("Please confirm the Guardian Account Terms to create your family hub.");
  if (!name.trim()) throw new Error("Enter a name for your family hub.");
  return { p_name: name.trim(), p_timezone: timezone };
}

// One form submission may create a record even if its response is lost.
// Only a definite HTTP rejection permits another create request in this form.
export function createOnboardingAttempt() {
  let state: "ready" | "pending" | "saved" | "uncertain" = "ready";
  return {
    state: () => state,
    async run(request: () => PromiseLike<{ data: unknown; error: unknown; status: number }>) {
      if (state !== "ready") throw new Error("Refresh your family hub before submitting again.");
      state = "pending";
      try {
        const result = await request();
        if (result.error) {
          state = result.status >= 400 && result.status < 500 && result.status !== 408 ? "ready" : "uncertain";
          throw result.error;
        }
        if (typeof result.data !== "string" || !result.data.trim()) throw new Error("The saved profile could not be confirmed.");
        state = "saved";
      } catch (error) {
        if (state === "pending") state = "uncertain";
        throw error;
      }
    }
  };
}

export async function saveOnboardingPin(client: SupabaseClient<Database>, householdId: string, pin: string, confirmation: string) {
  if (!/^\d{4,6}$/.test(pin)) throw new Error("Choose a 4 to 6 digit guardian PIN.");
  if (pin !== confirmation) throw new Error("The PINs do not match.");
  const { error } = await client.rpc("set_guardian_pin", { p_household_id: householdId, p_pin: pin });
  if (error) throw error;
  const { data, error: checkError } = await client.rpc("guardian_pin_status", { p_household_id: householdId });
  if (checkError) throw checkError;
  if (data?.[0]?.configured !== true) throw new Error("Your guardian PIN setup could not be confirmed. Please try again.");
}
