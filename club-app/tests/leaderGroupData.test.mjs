import test from "node:test";
import assert from "node:assert/strict";
import { readLeaderGroup } from "../src/lib/leaderGroupData.ts";

function fixture(failure) {
  const calls=[];
  const assignments=[{id:"assignment",challenge_id:"challenge",due_at:null,challenges:null}];
  const roster=[{child_profile_id:"child",display_name:"Sam",membership_status:"active",joined_at:"2026-09-25"}];
  const summary={active_children:1,completed_children:1,completion_percent:100};
  const client={
    from(table){calls.push(table);return {select(){return this;},eq(key,value){calls.push([key,value]);return this;},async order(){return failure==="assignments"?{error:new Error("Denied")}:{data:assignments,error:null};}};},
    async rpc(name,args){calls.push([name,args]);
      if(name==="get_group_roster")return failure==="roster"?{error:new Error("Unavailable")}:{data:roster,error:null};
      if(failure==="progress")return {error:new Error("Unavailable")};
      return {data:failure==="missing-progress"?[]:[summary],error:null};
    }
  };
  return {client,calls,assignments,roster,summary};
}
test("leader snapshot scopes every read to the selected group",async()=>{
  const f=fixture();const result=await readLeaderGroup(f.client,"group-a");
  assert.deepEqual(result,{assignments:f.assignments,roster:f.roster,progress:{challenge:f.summary}});
  assert.deepEqual(f.calls,["group_challenge_assignments",["group_id","group-a"],
    ["get_group_roster",{p_group_id:"group-a"}],
    ["get_group_progress_summary",{p_group_id:"group-a",p_challenge_id:"challenge"}]]);
});
for(const failure of ["assignments","roster","progress","missing-progress"])test(`${failure} failure never becomes an empty roster or zero progress`,async()=>{
  await assert.rejects(readLeaderGroup(fixture(failure).client,"group-a"));
});
test("no selected group cannot query a roster",async()=>{
  const f=fixture();await assert.rejects(readLeaderGroup(f.client,""));assert.deepEqual(f.calls,[]);
});
test("successful empty group remains a valid empty result",async()=>{
  const f=fixture();f.assignments.length=0;f.roster.length=0;
  assert.deepEqual(await readLeaderGroup(f.client,"group-a"),{assignments:[],roster:[],progress:{}});
});
