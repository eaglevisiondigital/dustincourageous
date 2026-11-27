import test from "node:test";
import assert from "node:assert/strict";
import { completeFamilyFaith, markNotificationRead, saveNotificationPreferences, validatePreferences } from "../src/lib/familyActions.ts";

const preferences={email_enabled:true,push_enabled:false,product_updates:true,child_progress:true,rewards:true,family_reminders:true,marketing:false,quiet_hours_start:null,quiet_hours_end:null,timezone:"America/Chicago"};
function fixture(results){
  const calls=[];
  return {calls,from(table){
    const call={table,filters:[]};calls.push(call);
    const query={
      upsert(value,options){call.upsert=value;call.options=options;return query;},
      update(value){call.update=value;return query;},
      select(){return query;},
      eq(key,value){call.filters.push(["eq",key,value]);return query;},
      is(key,value){call.filters.push(["is",key,value]);return query;},
      single(){return query;},
      then(resolve,reject){return Promise.resolve(results.shift()).then(resolve,reject);}
    };return query;
  }};
}
test("quiet hours support off, same-day, and overnight windows",()=>{
  for(const times of [{},{quiet_hours_start:"09:00",quiet_hours_end:"17:00"},{quiet_hours_start:"21:00:00",quiet_hours_end:"07:00:00"}])validatePreferences({...preferences,...times});
});
for(const [name,changes] of [
  ["one missing time",{quiet_hours_start:"21:00"}],
  ["invalid hour",{quiet_hours_start:"25:00",quiet_hours_end:"07:00"}],
  ["equal times",{quiet_hours_start:"07:00",quiet_hours_end:"07:00:00"}],
  ["invalid timezone",{timezone:"Made/Up"}],
  ["empty timezone",{timezone:""}]
])test(`rejects ${name}`,()=>assert.throws(()=>validatePreferences({...preferences,...changes})));
test("preference save confirms the current user and keeps marketing opt-out",async()=>{
  const client=fixture([{data:{...preferences,user_id:"guardian"},error:null}]);
  await saveNotificationPreferences(client,"guardian",preferences);
  assert.equal(client.calls[0].upsert.marketing,false);
  assert.equal(client.calls[0].upsert.user_id,"guardian");
});
test("preference save cannot succeed with a missing or wrong-user response",async()=>{
  for(const data of [null,{...preferences,user_id:"other"}])await assert.rejects(saveNotificationPreferences(fixture([{data,error:null}]),"guardian",preferences));
});
for(const childId of [null,"child-a"])test(`Family Faith confirms ${childId??"whole-family"} scope`,async()=>{
  const client=fixture([{error:null},{data:{id:"session",completed_at:"2026-09-25"},error:null}]);
  await completeFamilyFaith(client,"family","guide",childId,"guardian");
  assert.equal(client.calls[0].options.ignoreDuplicates,true);
  assert.deepEqual(client.calls[1].filters,[["eq","household_id","family"],["eq","family_faith_guide_id","guide"],[childId===null?"is":"eq","child_profile_id",childId]]);
});
test("unconfirmed Family Faith completion rejects",async()=>{
  await assert.rejects(completeFamilyFaith(fixture([{error:null},{data:null,error:null}]),"family","guide",null,"guardian"));
});
test("read notification mutation is scoped to its user and confirms saved status",async()=>{
  const client=fixture([{data:{id:"notice",status:"read"},error:null}]);
  await markNotificationRead(client,"guardian","notice");
  assert.deepEqual(client.calls[0].filters,[["eq","id","notice"],["eq","user_id","guardian"]]);
  await assert.rejects(markNotificationRead(fixture([{data:null,error:null}]),"guardian","notice"));
});
