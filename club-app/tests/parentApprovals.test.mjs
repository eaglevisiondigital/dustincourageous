import test from 'node:test';
import assert from 'node:assert/strict';
import {readParentApprovals,confirmParentDecision} from '../src/lib/parentApprovals.ts';
const row=(id='p')=>({id,child_profile_id:'a',challenge_id:'c',submitted_at:null,child_profiles:{household_id:'home',status:'active',display_name:'Child'},challenges:null});
function fixture(data,error=null){
 const calls=[];const q={select(...args){calls.push(['select',...args]);return q;},eq(...args){calls.push(['eq',...args]);return q;},in(...args){calls.push(['in',...args]);return q;},order(...args){calls.push(['order',...args]);return q;},limit(...args){calls.push(['limit',...args]);return q;},single(){return q;},then(resolve,reject){return Promise.resolve({data,error}).then(resolve,reject);}};
 return {calls,from(table){calls.push(['from',table]);return q;}};
}
test('approval queue checks active household, pending status and deduplicated children',async()=>{
 const c=fixture([row()]);assert.equal((await readParentApprovals(c,'home',['a','a'])).items.length,1);
 assert.ok(c.calls.some(x=>x[0]==='eq'&&x[1]==='child_profiles.household_id'&&x[2]==='home'));
 assert.ok(c.calls.some(x=>x[0]==='eq'&&x[1]==='child_profiles.status'&&x[2]==='active'));
 assert.ok(c.calls.some(x=>x[0]==='eq'&&x[1]==='status'&&x[2]==='pending_parent'));
 assert.deepEqual(c.calls.find(x=>x[0]==='in'),['in','child_profile_id',['a']]);
});
test('approval queue has explicit lookahead instead of silently omitting a large queue',async()=>{
 const c=fixture(Array.from({length:51},(_,i)=>row(String(i))));const result=await readParentApprovals(c,'home',['a']);
 assert.equal(result.items.length,50);assert.equal(result.hasMore,true);assert.deepEqual(c.calls.find(x=>x[0]==='limit'),['limit',51]);
 assert.equal((await readParentApprovals(fixture([row()]),'home',['a'])).hasMore,false);
});
test('empty roster performs no approval request',async()=>{
 const c=fixture([]);assert.deepEqual(await readParentApprovals(c,'home',[]),{items:[],hasMore:false});assert.deepEqual(c.calls,[]);
});
test('foreign, inactive, missing and duplicate approval rows fail closed',async()=>{
 for(const rows of [[{...row(),child_profile_id:'other'}],[{...row(),child_profiles:{household_id:'other',status:'active'}}],[{...row(),child_profiles:{household_id:'home',status:'archived'}}],[{...row(),child_profiles:null}],[row(),row()]])await assert.rejects(readParentApprovals(fixture(rows),'home',['a']));
 await assert.rejects(readParentApprovals(fixture(null,{message:'offline'}),'home',['a']));
});
test('decision confirmation requires exact child, progress and expected final state',async()=>{
 for(const [decision,status] of [['approve','completed'],['return','in_progress']]){
  await confirmParentDecision(fixture({id:'p',child_profile_id:'a',status}),'p','a',decision);
  for(const data of [null,{id:'other',child_profile_id:'a',status},{id:'p',child_profile_id:'other',status},{id:'p',child_profile_id:'a',status:'pending_parent'}])await assert.rejects(confirmParentDecision(fixture(data),'p','a',decision));
 }
 await assert.rejects(confirmParentDecision(fixture(null,{message:'offline'}),'p','a','approve'));
});
