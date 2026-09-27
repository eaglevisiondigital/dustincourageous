import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types/database";

export function createInvitationAcceptor(client:SupabaseClient<Database>,kind:"household"|"organization",invitationId:string,token:string){
  let acceptedId:string|null=null;
  let pending:Promise<string>|null=null;
  return {
    hasAccepted:()=>acceptedId!==null,
    accept():Promise<string>{
      if(acceptedId)return Promise.resolve(acceptedId);
      if(pending)return pending;
      pending=(async()=>{
        const {data,error}=await client.rpc(kind==="household"?"accept_household_invitation":"accept_organization_invitation",{p_invitation_id:invitationId,p_token:token});
        if(error)throw error;
        if(typeof data!=="string"||!data.trim())throw new Error("Invitation acceptance could not be confirmed.");
        acceptedId=data;
        return data;
      })().finally(()=>{pending=null;});
      return pending;
    }
  };
}
