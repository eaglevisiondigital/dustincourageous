import test from 'node:test';
import assert from 'node:assert/strict';
import {createClient} from '@supabase/supabase-js';
import {readOpenFamilyChallenges} from '../src/lib/familyActivityHistory.ts';
const home='11111111-1111-4111-8111-111111111111', child='22222222-2222-4222-8222-222222222222';
const row={id:'33333333-3333-4333-8333-333333333333',challenge_id:'44444444-4444-4444-8444-444444444444',child_profile_id:child,status:'in_progress',updated_at:'2026-09-25T13:00:00.123456+00:00',child_profiles:{household_id:home,status:'active'},challenges:{id:'44444444-4444-4444-8444-444444444444',title:'Learn Together',status:'published'}};
function fixture(data,status=200){const urls=[];const client=createClient('https://progress.example.test','test-key',{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{fetch:async url=>{urls.push(new URL(url));return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});}}});return {client,urls};}
test('open family challenges scope household, active children and unfinished statuses without evidence text',async()=>{
 const f=fixture([row,{...row,status:'pending_parent'}]);const page=await readOpenFamilyChallenges(f.client,home,[child,child]);assert.equal(page.items.length,2);assert.equal(page.items[1].status,'pending_parent');assert.equal(page.hasMore,false);
 const q=f.urls[0].searchParams;assert.equal(q.get('child_profiles.household_id'),'eq.'+home);assert.equal(q.get('child_profiles.status'),'eq.active');assert.equal(q.get('child_profile_id'),`in.(${child})`);assert.equal(q.get('status'),'in.(in_progress,pending_parent)');assert.ok(!q.get('select').includes('evidence'));assert.equal(q.get('limit'),'51');
});
test('open family challenges reject foreign or archived children and unexpected statuses',async()=>{
 for(const change of [{child_profile_id:home},{child_profiles:{household_id:child,status:'active'}},{child_profiles:{household_id:home,status:'archived'}},{child_profiles:null},{status:'completed'},{updated_at:'invalid'}])await assert.rejects(readOpenFamilyChallenges(fixture([{...row,...change}]).client,home,[child]));
});
test('hidden challenge keeps progress context and bounded results disclose more records',async()=>{
 const hidden=await readOpenFamilyChallenges(fixture([{...row,challenges:null}]).client,home,[child]);assert.equal(hidden.items[0].title,'Challenge Unavailable');
 const page=await readOpenFamilyChallenges(fixture(Array.from({length:51},()=>row)).client,home,[child]);assert.equal(page.items.length,50);assert.equal(page.hasMore,true);
});
test('empty children make no request and invalid scope or API errors do not produce an empty success',async()=>{
 const f=fixture([]);assert.deepEqual(await readOpenFamilyChallenges(f.client,home,[]),{items:[],hasMore:false});await assert.rejects(readOpenFamilyChallenges(f.client,'invalid',[child]));assert.equal(f.urls.length,0);await assert.rejects(readOpenFamilyChallenges(fixture({message:'Denied'},403).client,home,[child]));
});

test('only matching published challenge relations can be reopened',async()=>{
 const available=await readOpenFamilyChallenges(fixture([row]).client,home,[child]);assert.equal(available.items[0].challengeId,row.challenge_id);
 for(const challenges of [null,{...row.challenges,status:'draft'},{...row.challenges,id:home}]){
  const page=await readOpenFamilyChallenges(fixture([{...row,challenges}]).client,home,[child]);assert.equal(page.items[0].challengeId,null);assert.equal(page.items[0].title,'Challenge Unavailable');
 }
});
