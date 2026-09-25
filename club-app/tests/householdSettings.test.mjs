import test from "node:test";
import assert from "node:assert/strict";
import { saveHouseholdSettings,revokeHouseholdInvite } from "../src/lib/householdSettings.ts";

function fixture(data,error=null){
  const calls=[];
  return {calls,async rpc(name,args){calls.push({name,args});return {error};},from(table){
    const call={table,filters:[]};calls.push(call);
    const q={update(value){call.update=value;return q;},eq(key,value){call.filters.push([key,value]);return q;},select(){return q;},async single(){return {data,error};}};
    return q;
  }};
}
test("household save trims input and confirms the target household",async()=>{
  const client=fixture({id:"family",name:"Our Family",timezone:"America/Chicago"});
  await saveHouseholdSettings(client,"family"," Our Family "," America/Chicago ");
  assert.deepEqual(client.calls[0].update,{name:"Our Family",timezone:"America/Chicago"});
  assert.deepEqual(client.calls[0].filters,[["id","family"]]);
});
test("invalid household input never reaches the database",async()=>{
  for(const [name,timezone] of [[" ","UTC"],["Family",""],["Family","Invalid/Zone"]]){
    const client=fixture(null);
    await assert.rejects(saveHouseholdSettings(client,"family",name,timezone));
    assert.equal(client.calls.length,0);
  }
});
test("missing, mismatched, or failed household writes cannot confirm success",async()=>{
  for(const data of [null,{id:"other",name:"Family",timezone:"UTC"},{id:"family",name:"Old",timezone:"UTC"}])await assert.rejects(saveHouseholdSettings(fixture(data),"family","Family","UTC"));
  await assert.rejects(saveHouseholdSettings(fixture(null,new Error("Denied")),"family","Family","UTC"));
});
test("invite revocation verifies household and saved revoked status",async()=>{
  const client=fixture({id:"invite",status:"revoked"});
  await revokeHouseholdInvite(client,"family","invite");
  assert.deepEqual(client.calls[0],{name:"revoke_household_invitation",args:{p_invitation_id:"invite"}});
  assert.deepEqual(client.calls[1].filters,[["id","invite"],["household_id","family"]]);
});
test("an accepted, pending, or unreadable invitation cannot appear revoked",async()=>{
  for(const data of [null,{id:"invite",status:"accepted"},{id:"invite",status:"pending"}])await assert.rejects(revokeHouseholdInvite(fixture(data),"family","invite"));
});
