import test from 'node:test';
import assert from 'node:assert/strict';
import {moveRewardRequest,requestUnlockedReward,rewardStatusLabel} from '../src/lib/rewardRequests.ts';
function fixture(data,error=null){const calls=[];const q={update(value){calls.push(['update',value]);return q;},insert(value){calls.push(['insert',value]);return q;},eq(...args){calls.push(['eq',...args]);return q;},select(){return q;},single:async()=>({data,error})};return {calls,from(){return q;}};}
test('staff reward update compares the previously displayed status before changing a row',async()=>{
 const c=fixture({id:'r',status:'approved'});await moveRewardRequest(c,'r','requested','approved');assert.deepEqual(c.calls,[['update',{status:'approved'}],['eq','id','r'],['eq','status','requested']]);
});
test('unsupported and terminal reward transitions do not issue writes',async()=>{
 for(const [current,next] of [['requested','fulfilled'],['denied','approved'],['fulfilled','processing'],['unknown','approved']]){const c=fixture(null);await assert.rejects(moveRewardRequest(c,'r',current,next));assert.deepEqual(c.calls,[]);}
});
test('missing, stale, wrong-row and failed staff updates never confirm success',async()=>{
 for(const data of [null,{id:'other',status:'approved'},{id:'r',status:'requested'}])await assert.rejects(moveRewardRequest(fixture(data),'r','requested','approved'));
 await assert.rejects(moveRewardRequest(fixture(null,{message:'denied'}),'r','requested','approved'));
});
test('all displayed staff transitions confirm their intended resulting status',async()=>{
 for(const [current,next] of [['requested','approved'],['requested','denied'],['approved','processing'],['approved','fulfilled'],['processing','fulfilled']])await moveRewardRequest(fixture({id:'r',status:next}),'r',current,next);
});
test('family requests require exact unlock and requested status and keep requester explicit',async()=>{
 const c=fixture({reward_unlock_id:'u',status:'requested'});await requestUnlockedReward(c,'u','adult');assert.deepEqual(c.calls[0],['insert',{reward_unlock_id:'u',requested_by:'adult',status:'requested'}]);
 for(const data of [null,{reward_unlock_id:'other',status:'requested'},{reward_unlock_id:'u',status:'approved'}])await assert.rejects(requestUnlockedReward(fixture(data),'u','adult'));
});
test('reward labels are capitalized without exposing arbitrary internal values',()=>{
 assert.equal(rewardStatusLabel('requested'),'Requested');assert.equal(rewardStatusLabel('fulfilled'),'Fulfilled');assert.equal(rewardStatusLabel('unexpected_internal_value'),'Status Unavailable');
});
