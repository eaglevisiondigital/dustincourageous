import test from 'node:test';
import assert from 'node:assert/strict';
import {createClient} from '@supabase/supabase-js';
import {loadHouseholdAssignments} from '../src/lib/familyAssignments.ts';
const home='11111111-1111-4111-8111-111111111111',a='22222222-2222-4222-8222-222222222222',b='33333333-3333-4333-8333-333333333333';
const row={id:'assignment',household_id:home,child_profile_id:null,challenge_id:'challenge',due_at:null,challenges:{id:'challenge',title:'Family Task',xp_reward:5,status:'published'}};
function fixture(rows,status=200){const urls=[];const client=createClient('https://assignments.example.test','key',{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{fetch:async url=>{urls.push(new URL(url));return new Response(JSON.stringify(rows),{status,headers:{'Content-Type':'application/json'}});}}});return {client,urls};}
test('whole-family assignments include active child IDs while direct assignments retain their recipient',async()=>{
 const f=fixture([row,{...row,id:'direct',child_profile_id:b}]);const result=await loadHouseholdAssignments(f.client,home,[a,b,a]);assert.deepEqual(result[0].childIds,[a,b]);assert.deepEqual(result[1].childIds,[b]);assert.equal(result[0].groupName,'Whole Family');assert.equal(result[1].groupName,'Child Assignment');
 assert.equal(f.urls[0].searchParams.get('household_id'),'eq.'+home);assert.equal(f.urls[0].searchParams.get('or'),`(child_profile_id.is.null,child_profile_id.in.(${a},${b}))`);assert.equal(f.urls[0].searchParams.get('challenges.status'),'eq.published');
});
test('foreign family/child and unpublished joined content fail closed',async()=>{
 for(const changes of [{household_id:a},{child_profile_id:b},{challenges:{...row.challenges,status:'draft'}},{challenges:{...row.challenges,id:'other'}}])await assert.rejects(loadHouseholdAssignments(fixture([{...row,...changes}]).client,home,[a]));
});
test('hidden content retains unavailable assignment context and errors are not empty results',async()=>{
 assert.equal((await loadHouseholdAssignments(fixture([{...row,challenges:null}]).client,home,[a]))[0].challenge,null);
 await assert.rejects(loadHouseholdAssignments(fixture({message:'denied'},403).client,home,[a]));
});
test('empty selection and malformed scope cannot issue broad requests',async()=>{
 const f=fixture([]);assert.deepEqual(await loadHouseholdAssignments(f.client,home,[]),[]);await assert.rejects(loadHouseholdAssignments(f.client,home,['bad),id.gt.0']));await assert.rejects(loadHouseholdAssignments(f.client,'',[a]));assert.equal(f.urls.length,0);
});
