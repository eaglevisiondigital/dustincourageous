import test from "node:test";
import assert from "node:assert/strict";
import { updateSupportTicket,validatedLaunchChecks } from "../src/lib/adminOperations.ts";

const ticket={id:"ticket",status:"resolved",priority:"normal",updated_at:"2026-09-25T00:00:00Z",resolved_at:"2026-09-24T00:00:00Z"};
function fixture(result){
  const calls={filters:[]};
  const query={update(value){calls.payload=value;return query;},eq(key,value){calls.filters.push([key,value]);return query;},select(){return query;},async single(){return result;}};
  return {calls,from(){return query;}};
}
test("priority changes preserve resolution time and guard the loaded ticket version",async()=>{
  const client=fixture({data:{id:"ticket",status:"resolved",priority:"high"},error:null});
  await updateSupportTicket(client,ticket,{priority:"high"});
  assert.equal(client.calls.payload.resolved_at,ticket.resolved_at);
  assert.deepEqual(client.calls.filters,[["id","ticket"],["updated_at",ticket.updated_at],["status","resolved"],["priority","normal"]]);
});
test("reopening clears resolution time",async()=>{
  const client=fixture({data:{id:"ticket",status:"open",priority:"normal"},error:null});
  await updateSupportTicket(client,ticket,{status:"open"});
  assert.equal(client.calls.payload.resolved_at,null);
});
test("closing a resolved ticket preserves its resolution time",async()=>{
  const client=fixture({data:{id:"ticket",status:"closed",priority:"normal"},error:null});
  await updateSupportTicket(client,ticket,{status:"closed"});
  assert.equal(client.calls.payload.resolved_at,ticket.resolved_at);
});
test("stale, inaccessible, or mismatched updates cannot report success",async()=>{
  for(const result of [{data:null,error:null},{data:null,error:new Error("Conflict")},{data:{id:"ticket",status:"closed",priority:"normal"},error:null}])await assert.rejects(updateSupportTicket(fixture(result),ticket,{status:"open"}));
});
const check={area:"Commerce",check_key:"provider",title:"Provider connected",severity:"blocker",passed:false,detail:"Pending"};
test("valid launch results preserve failed blockers",()=>assert.deepEqual(validatedLaunchChecks([check]),[check]));
for(const [name,value] of [
  ["empty",[]],["missing",null],["truthy pass string",[{...check,passed:"false"}]],
  ["unknown severity",[{...check,severity:"critical"}]],["missing detail",[{...check,detail:null}]],
  ["duplicate checks",[check,check]]
])test(`launch results fail closed for ${name}`,()=>assert.throws(()=>validatedLaunchChecks(value)));
