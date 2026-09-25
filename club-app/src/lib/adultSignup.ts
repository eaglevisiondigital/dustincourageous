export function adultSignupMetadata(firstName: string, lastName: string, cellPhone: string, relationship: string, leader = false) {
  const first = firstName.trim();
  const last = lastName.trim();
  const phone = cellPhone.trim();
  if (!first || !last || first.length > 80 || last.length > 80) throw new Error("Enter the adult’s first and last name (up to 80 characters each).");
  if (!leader && relationship !== "parent" && relationship !== "guardian") throw new Error("Please choose Parent or Guardian.");
  if (phone && (!/^\+?[\d\s().-]+$/.test(phone) || phone.replace(/\D/g, "").length < 7 || phone.replace(/\D/g, "").length > 15 || phone.length > 40)) throw new Error("Enter a valid cell phone number, including the country code if outside the U.S.");
  return { first_name: first, last_name: last, display_name: first,
    ...(phone ? { adult_contact_phone: phone } : {}),
    ...(!leader ? { family_relationship: relationship } : {}) };
}

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types/database";
export type AdultDetails = { firstName: string; lastName: string; cellPhone: string; relationship: string; email: string };
export async function readAdultDetails(client: SupabaseClient<Database>, userId: string): Promise<AdultDetails> {
  const auth = await client.auth.getUser();
  if (auth.error || !auth.data.user || auth.data.user.id !== userId) throw new Error("Account could not be confirmed");
  const { data, error } = await client.from("profiles").select("id,first_name,last_name").eq("id", userId).single();
  if (error || !data || data.id !== userId) throw new Error("Profile could not be loaded");
  const user = auth.data.user;
  return { firstName: data.first_name ?? "", lastName: data.last_name ?? "", email: user.email ?? "",
    cellPhone: typeof user.user_metadata.adult_contact_phone === "string" ? user.user_metadata.adult_contact_phone : "",
    relationship: user.user_metadata.family_relationship === "parent" ? "parent" : "guardian" };
}
export async function saveAdultDetails(client: SupabaseClient<Database>, userId: string, details: AdultDetails) {
  const metadata = { ...adultSignupMetadata(details.firstName, details.lastName, details.cellPhone, details.relationship), adult_contact_phone: details.cellPhone.trim() || null };
  const auth = await client.auth.getUser();
  if (auth.error || auth.data.user?.id !== userId) throw new Error("Account could not be confirmed");
  const updated = await client.auth.updateUser({ data: metadata });
  if (updated.error || updated.data.user?.id !== userId || Object.entries(metadata).some(([key, value]) => updated.data.user?.user_metadata[key] !== value)) throw new Error("Contact details could not be confirmed");
  const { data, error } = await client.from("profiles").update({ first_name: metadata.first_name, last_name: metadata.last_name, display_name: metadata.display_name })
    .eq("id", userId).select("id,first_name,last_name,display_name").single();
  if (error || !data || data.id !== userId || data.first_name !== metadata.first_name || data.last_name !== metadata.last_name || data.display_name !== metadata.display_name) throw new Error("Profile details could not be confirmed");
}
