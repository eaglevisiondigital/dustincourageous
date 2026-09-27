import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types/database";

export async function saveHouseholdSettings(client:SupabaseClient<Database>,householdId:string,name:string,timezone:string){
  const cleanName=name.trim();
  const cleanTimezone=timezone.trim();
  if(!cleanName)throw new Error("Enter a Family Hub name.");
  if(!cleanTimezone)throw new Error("Enter a household timezone.");
  try {new Intl.DateTimeFormat("en-US",{timeZone:cleanTimezone}).format();}
  catch {throw new Error("Enter a valid timezone, such as America/Chicago.");}
  const {data,error}=await client.from("households").update({name:cleanName,timezone:cleanTimezone})
    .eq("id",householdId).select("id,name,timezone").single();
  if(error)throw error;
  if(data?.id!==householdId||data.name!==cleanName||data.timezone!==cleanTimezone)throw new Error("Household settings could not be confirmed.");
  return data;
}

export async function revokeHouseholdInvite(client:SupabaseClient<Database>,householdId:string,invitationId:string){
  const {error}=await client.rpc("revoke_household_invitation",{p_invitation_id:invitationId});
  if(error)throw error;
  const result=await client.from("household_invitations").select("id,status")
    .eq("id",invitationId).eq("household_id",householdId).single();
  if(result.error)throw result.error;
  if(result.data?.id!==invitationId||result.data.status!=="revoked")throw new Error("Invitation revocation could not be confirmed.");
}
