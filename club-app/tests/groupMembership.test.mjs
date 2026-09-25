import test from "node:test";
import assert from "node:assert/strict";
import { joinApprovedGroup, matchesGroupApproval, withdrawGroup } from "../src/lib/groupMembership.ts";

const approval={code:"ABCD123456",childId:"child-a",groupId:"group-a"};
function fixture({rpcData="group-a",rpcError=null,status="active",rowError=null,missing=false}={}) {
  const calls=[];
  return {
    calls,
    async rpc(name,args){calls.push({name,args});return {data:rpcData,error:rpcError};},
    from(table){
      const call={table,filters:[]};calls.push(call);
      const query={
        select(){return query;},
        eq(key,value){call.filters.push([key,value]);return query;},
        async single(){return {data:missing?null:{status},error:rowError};}
      };
      return query;
    }
  };
}

test("approval is bound to the exact previewed code and child",()=>{
  assert.equal(matchesGroupApproval(approval," ABCD123456 ","child-a"),true);
  assert.equal(matchesGroupApproval(approval,"FFFF123456","child-a"),false);
  assert.equal(matchesGroupApproval(approval,"ABCD123456","child-b"),false);
});

test("join confirms the approved group and reads only the approved child's membership",async()=>{
  const client=fixture();
  await joinApprovedGroup(client,approval);
  assert.deepEqual(client.calls,[
    {name:"join_child_to_group",args:{p_code:approval.code,p_child_profile_id:"child-a"}},
    {table:"child_group_memberships",filters:[["group_id","group-a"],["child_profile_id","child-a"]]}
  ]);
});

for(const [name,config] of [
  ["different group",{rpcData:"group-b"}],
  ["missing group",{rpcData:null}],
  ["RPC failure",{rpcError:new Error("Failed")}],
  ["missing membership",{missing:true}],
  ["inactive membership",{status:"withdrawn"}],
  ["verification failure",{rowError:new Error("Unavailable")}]
])test(`join cannot report success with ${name}`,async()=>{
  await assert.rejects(joinApprovedGroup(fixture(config),approval));
});

test("withdrawal verifies the exact child and group before confirming",async()=>{
  const client=fixture({status:"withdrawn"});
  await withdrawGroup(client,"group-a","child-a");
  assert.deepEqual(client.calls[0],{name:"withdraw_child_from_group",args:{p_group_id:"group-a",p_child_profile_id:"child-a"}});
  assert.deepEqual(client.calls[1].filters,[["group_id","group-a"],["child_profile_id","child-a"]]);
});

test("an active or unreadable membership cannot appear withdrawn",async()=>{
  for(const config of [{status:"active"},{missing:true},{rowError:new Error("Unavailable")},{rpcError:new Error("Denied")}]) {
    await assert.rejects(withdrawGroup(fixture(config),"group-a","child-a"));
  }
});
