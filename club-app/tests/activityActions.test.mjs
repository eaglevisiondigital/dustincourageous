import test from "node:test";
import assert from "node:assert/strict";
import { activityExternalUrl, activityAssetUrl, completeActivity } from "../src/lib/activityActions.ts";

test("activity links require HTTPS and reject credentials and script URLs",()=>{
  for(const value of [null,"javascript:alert(1)","data:text/html,test","http://example.com","https://user:pass@example.com","/file"])assert.equal(activityExternalUrl(value),null);
  assert.equal(activityExternalUrl("https://example.com/file"),"https://example.com/file");
});
test("private files request a fresh signed URL each time they open",async()=>{
  const calls=[];const client={storage:{from(bucket){return {async createSignedUrl(path,seconds){calls.push({bucket,path,seconds});return {data:{signedUrl:"https://example.com/file?token="+calls.length},error:null};}};}}};
  const asset={bucket_name:"dc-member",object_path:"file.pdf",visibility:"member"};
  assert.notEqual(await activityAssetUrl(client,asset),await activityAssetUrl(client,asset));
  assert.deepEqual(calls,[{bucket:"dc-member",path:"file.pdf",seconds:900},{bucket:"dc-member",path:"file.pdf",seconds:900}]);
});
test("public links require public bucket and public visibility",async()=>{
  let signed=0;const client={storage:{from(){return {getPublicUrl(){return {data:{publicUrl:"https://example.com/public"}};},async createSignedUrl(){signed++;return {data:{signedUrl:"https://example.com/signed"},error:null};}};}}};
  assert.equal(await activityAssetUrl(client,{bucket_name:"dc-public",object_path:"file",visibility:"public"}),"https://example.com/public");
  await activityAssetUrl(client,{bucket_name:"dc-public",object_path:"file",visibility:"premium"});assert.equal(signed,1);
});
test("failed or unsafe signed URL never opens a fallback asset",async()=>{
  for(const response of [{data:null,error:new Error("Denied")},{data:null,error:null},{data:{signedUrl:"javascript:alert(1)"},error:null}]){
    await assert.rejects(activityAssetUrl({storage:{from(){return {async createSignedUrl(){return response;}};}}},{bucket_name:"private",object_path:"file",visibility:"member"}));
  }
});
function progressClient(before,after,writeError=null){
  const calls=[];let reads=0;
  return {calls,from(table){const call={table,filters:[]};calls.push(call);
    const chain={select(){call.action="read";return chain;},eq(key,value){call.filters.push([key,value]);return chain;},
      maybeSingle(){return Promise.resolve(reads++===0?before:after);},update(value){call.action="update";call.value=value;return chain;},
      upsert(value,options){call.action="upsert";call.value=value;call.options=options;return chain;},
      then(resolve,reject){return Promise.resolve({error:writeError}).then(resolve,reject);}};return chain;
  }};
}
test("already-completed activity does not rewrite dates or repeat completion",async()=>{
  const client=progressClient({data:{id:"p",status:"completed"},error:null});
  await completeActivity(client,"child","content");assert.equal(client.calls.length,1);
});
test("new completion ignores competing inserts and verifies scoped saved status",async()=>{
  const client=progressClient({data:null,error:null},{data:{id:"p",status:"completed"},error:null});
  await completeActivity(client,"child","content");
  assert.deepEqual(client.calls[1].options,{onConflict:"child_profile_id,content_item_id",ignoreDuplicates:true});
  for(const call of [client.calls[0],client.calls[2]])assert.deepEqual(call.filters,[["child_profile_id","child"],["content_item_id","content"]]);
});
test("existing progress preserves start time and guards previous status",async()=>{
  const client=progressClient({data:{id:"p",status:"in_progress",started_at:"2026-09-01"},error:null},{data:{id:"p",status:"completed"},error:null});
  await completeActivity(client,"child","content");
  assert.equal(client.calls[1].value.started_at,"2026-09-01");
  assert.deepEqual(client.calls[1].filters,[["id","p"],["child_profile_id","child"],["content_item_id","content"],["status","in_progress"]]);
});
test("read failures stop completion before writing",async()=>{
  const client=progressClient({data:null,error:new Error("Unavailable")});
  await assert.rejects(completeActivity(client,"child","content"));assert.equal(client.calls.length,1);
});
test("failed writes and unconfirmed final states never report completed",async()=>{
  for(const [after,error] of [[{data:null,error:null},null],[{data:{status:"in_progress"},error:null},null],[{data:null,error:new Error("Unavailable")},null],[{data:{status:"completed"},error:null},new Error("Denied")]]){
    await assert.rejects(completeActivity(progressClient({data:null,error:null},after,error),"child","content"));
  }
});
