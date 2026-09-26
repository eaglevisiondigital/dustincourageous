import test from 'node:test';
import assert from 'node:assert/strict';
import { saveFamilyParticipation } from '../src/lib/familyParticipation.ts';
function client(data,error=null){const calls=[];return {calls,rpc:async(name,args)=>{calls.push({name,args});return {data,error};}};}
test('family completion sends one atomic request with unique participants',async()=>{
 const c=client([{child_profile_id:'a',status:'completed'},{child_profile_id:'b',status:'pending_parent'}]);
 await saveFamilyParticipation(c,'home','task',['a','b','a'],'challenge','complete',['step','step']);
 assert.equal(c.calls.length,1);assert.deepEqual(c.calls[0].args,{p_household_id:'home',p_challenge_id:'task',p_child_ids:['a','b'],p_action:'complete',p_step_ids:['step']});
});
test('empty participant selection does not send a write',async()=>{const c=client([]);await assert.rejects(saveFamilyParticipation(c,'h','g',[],'faith'));assert.equal(c.calls.length,0);});
test('partial, duplicated, wrong-child and unknown-status results never report full success',async()=>{
 for(const rows of [[],[{child_profile_id:'a',status:'completed'}],[{child_profile_id:'a',status:'completed'},{child_profile_id:'a',status:'completed'}],[{child_profile_id:'a',status:'completed'},{child_profile_id:'other',status:'completed'}],[{child_profile_id:'a',status:'completed'},{child_profile_id:'b',status:'in_progress'}]]) await assert.rejects(saveFamilyParticipation(client(rows),'h','c',['a','b'],'challenge','complete'));
});
test('participation keeps completed and pending children intact',async()=>{await saveFamilyParticipation(client([{child_profile_id:'a',status:'completed'},{child_profile_id:'b',status:'pending_parent'},{child_profile_id:'c',status:'in_progress'}]),'h','c',['a','b','c'],'challenge','participate');});
test('faith credit confirms every child without supplying another completed_by identity',async()=>{
 const c=client([{child_profile_id:'a',status:'completed'}]);await saveFamilyParticipation(c,'h','g',['a'],'faith');assert.equal(c.calls[0].name,'complete_family_faith_participants');assert.deepEqual(c.calls[0].args,{p_household_id:'h',p_guide_id:'g',p_child_ids:['a']});
});
test('backend failure is never presented as saved participation',async()=>{await assert.rejects(saveFamilyParticipation(client(null,{message:'denied'}),'h','g',['a'],'faith'));});
