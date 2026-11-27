import test from "node:test";
import assert from "node:assert/strict";
import { readBookAdventure, saveBookStatus, finishBookAdventure, completeBookStep } from "../src/lib/bookActions.ts";

function fixture(reads=[],rpc={data:true,error:null},writeError=null){
  const calls=[];
  return {calls,async rpc(name,args){calls.push({rpc:name,args});return typeof rpc==="function"?rpc(name,args):rpc;},from(table){
    const call={table,filters:[]};calls.push(call);
    const chain={select(){return chain;},eq(key,value){call.filters.push([key,value]);return chain;},
      update(value){call.action="update";call.value=value;return chain;},upsert(value,options){call.action="upsert";call.value=value;call.options=options;return chain;},
      maybeSingle(){return Promise.resolve(reads.shift());},single(){return Promise.resolve(reads.shift());},then(resolve,reject){return Promise.resolve({error:writeError}).then(resolve,reject);}};
    return chain;
  }};
}
for(const status of ["completed","adventure_completed"])test(`${status} cannot be downgraded by starting reading`,async()=>{
  const client=fixture([{data:{id:"progress",status},error:null}]);await saveBookStatus(client,"child","book","reading");assert.equal(client.calls.length,1);
});
test("book completion guards prior status and preserves start time",async()=>{
  const client=fixture([{data:{id:"progress",status:"reading",started_at:"2026-09-01"},error:null},{data:{status:"completed"},error:null}]);
  await saveBookStatus(client,"child","book","completed");
  assert.equal(client.calls[1].value.started_at,"2026-09-01");
  assert.deepEqual(client.calls[1].filters,[["id","progress"],["child_profile_id","child"],["book_id","book"],["status","reading"]]);
});
test("new reading progress does not overwrite a competing completion",async()=>{
  const client=fixture([{data:null,error:null},{data:{status:"adventure_completed"},error:null}]);await saveBookStatus(client,"child","book","reading");
  assert.deepEqual(client.calls[1].options,{onConflict:"child_profile_id,book_id",ignoreDuplicates:true});
});
test("unconfirmed book completion cannot return success",async()=>{
  for(const after of [{data:null,error:null},{data:{status:"reading"},error:null},{data:null,error:new Error("Unavailable")}]){
    await assert.rejects(saveBookStatus(fixture([{data:null,error:null},after]),"child","book","completed"));
  }
});
test("failed book lookup cannot send a write",async()=>{
  const client=fixture([{data:null,error:new Error("Unavailable")}]);await assert.rejects(saveBookStatus(client,"child","book","completed"));assert.equal(client.calls.length,1);
});
test("full adventure requires true RPC response and saved completion",async()=>{
  for(const rpc of [{data:false,error:null},{data:null,error:null},{data:true,error:new Error("Denied")}])await assert.rejects(finishBookAdventure(fixture([],rpc),"child","book"));
  for(const saved of [{data:null,error:null},{data:{status:"completed"},error:null},{data:{status:"adventure_completed",adventure_completed_at:null},error:null}])await assert.rejects(finishBookAdventure(fixture([saved]),"child","book"));
  const client=fixture([{data:{status:"adventure_completed",adventure_completed_at:"2026-09-25"},error:null}]);await finishBookAdventure(client,"child","book");
  assert.deepEqual(client.calls[1].filters,[["child_profile_id","child"],["book_id","book"]]);
});
test("adventure reads scope both RPCs and reject missing summary",async()=>{
  const client=fixture([],name=>({data:name==="get_child_book_adventure_steps"?[]:[{progress_percent:0}],error:null}));
  assert.deepEqual(await readBookAdventure(client,"child","book"),{steps:[],summary:{progress_percent:0}});
  for(const call of client.calls)assert.deepEqual(call.args,{p_child_profile_id:"child",p_book_id:"book"});
  await assert.rejects(readBookAdventure(fixture([],{data:[],error:null}),"child","book"));
});
test("identity step verifies the child, source, and learned state",async()=>{
  for(const data of [null,{child_profile_id:"other",identity_truth_id:"truth",learned:true},{child_profile_id:"child",identity_truth_id:"truth",learned:false}])await assert.rejects(completeBookStep(fixture([{data,error:null}]),"child","identity","truth"));
  await completeBookStep(fixture([{data:{child_profile_id:"child",identity_truth_id:"truth",learned:true},error:null}]),"child","identity","truth");
});
test("prayer completion preserves existing completion and verifies the saved record",async()=>{
  const client=fixture([{data:{completed_at:"2026-09-01"},error:null}]);await completeBookStep(client,"child","prayer","prayer");
  assert.equal(client.calls[0].options.ignoreDuplicates,true);assert.deepEqual(client.calls[1].filters,[["child_profile_id","child"],["prayer_prompt_id","prayer"]]);
  await assert.rejects(completeBookStep(fixture([{data:{completed_at:null},error:null}]),"child","prayer","prayer"));
});
test("unrecognized steps never report a successful save",async()=>{
  const client=fixture();await assert.rejects(completeBookStep(client,"child","challenge","challenge"));assert.deepEqual(client.calls,[]);
});
