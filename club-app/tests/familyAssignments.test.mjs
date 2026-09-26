import test from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import { loadFamilyAssignments } from '../src/lib/familyAssignments.ts';
const member = (child, group='group') => ({ group_id:group, child_profile_id:child,status:'active',adventure_groups:{id:group,name:'Family Group',status:'active'} });
const assignment = { id:'assignment', group_id:'group', challenge_id:'challenge',due_at:null,challenges:{id:'challenge',title:'Together',xp_reward:5,status:'published'} };
function fixture(members, assignments=[assignment], failAt='') {
 const urls=[];
 const client=createClient('https://family.example.test','test-key',{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{fetch:async url=>{
  const u=new URL(url);urls.push(u);const table=u.pathname.split('/').at(-1);
  const failed=table===failAt;
  return new Response(JSON.stringify(failed?{message:'Denied'}:table==='child_group_memberships'?members:assignments),{status:failed?403:200,headers:{'Content-Type':'application/json'}});
 }}});
 return {client,urls};
}
test('family assignments scope membership to selected children and combine siblings once per assignment',async()=>{
 const f=fixture([member('a'),member('b'),member('a')]);
 const rows=await loadFamilyAssignments(f.client,['a','b','a']);
 assert.equal(rows.length,1);assert.deepEqual(rows[0].childIds,['a','b']);
 assert.equal(f.urls[0].searchParams.get('child_profile_id'),'in.(a,b)');
 assert.equal(f.urls[0].searchParams.get('status'),'eq.active');
 assert.equal(f.urls[1].searchParams.get('group_id'),'in.(group)');
 assert.equal(f.urls[1].searchParams.get('challenges.status'),'eq.published');
 assert.equal(f.urls[1].searchParams.get('limit'),'100');
});
test('empty family, inactive groups and hidden groups do not request assignments',async()=>{
 const empty=fixture([]);assert.deepEqual(await loadFamilyAssignments(empty.client,[]),[]);assert.equal(empty.urls.length,0);
 for(const group of [null,{id:'group',name:'Paused',status:'paused'}]){
  const f=fixture([{...member('a'),adventure_groups:group}]);assert.deepEqual(await loadFamilyAssignments(f.client,['a']),[]);assert.equal(f.urls.length,1);
 }
});
test('unavailable challenges preserve assignment context without enabling an activity',async()=>{
 const f=fixture([member('a')],[{...assignment,challenges:null}]);
 const rows=await loadFamilyAssignments(f.client,['a']);assert.equal(rows[0].challenge,null);assert.equal(rows[0].groupName,'Family Group');
});
test('family assignments reject cross-family, wrong-group and unpublished results',async()=>{
 await assert.rejects(loadFamilyAssignments(fixture([member('other')]).client,['a']));
 for(const row of [{...assignment,group_id:'other'},{...assignment,challenges:{...assignment.challenges,status:'draft'}},{...assignment,challenges:{...assignment.challenges,id:'other'}}]) await assert.rejects(loadFamilyAssignments(fixture([member('a')],[row]).client,['a']));
});
test('membership and assignment errors remain failures rather than empty states',async()=>{
 for(const table of ['child_group_memberships','group_challenge_assignments']) await assert.rejects(loadFamilyAssignments(fixture([member('a')],[assignment],table).client,['a']));
});
