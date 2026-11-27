import test from 'node:test';
import assert from 'node:assert/strict';
import {readFamilyChallenge,currentFamilySelection} from '../src/lib/familyChallengeState.ts';
function fixture(overrides={}) {
 const calls=[];
 const results={challenges:{data:{id:'challenge',title:'Together',xp_reward:10},error:null},challenge_steps:{data:[],error:null},child_challenge_progress:{data:[{child_profile_id:'a',status:'in_progress'}],error:null},...overrides};
 const client={from(table){calls.push(['from',table]);const q={select(value){calls.push([table,'select',value]);return q;},eq(...args){calls.push([table,'eq',...args]);return q;},in(...args){calls.push([table,'in',...args]);return q;},order(){return q;},single(){return q;},then(resolve,reject){return Promise.resolve(results[table]).then(resolve,reject);}};return q;}};
 return {client,calls};
}
test('challenge refresh scopes published activity and unique participant progress',async()=>{
 const f=fixture();const result=await readFamilyChallenge(f.client,'challenge',['a','a']);
 assert.equal(result.progress[0].status,'in_progress');
 assert.ok(f.calls.some(c=>c[0]==='challenges'&&c[1]==='eq'&&c[2]==='status'&&c[3]==='published'));
 assert.ok(f.calls.some(c=>c[0]==='challenge_steps'&&c[2]==='challenge_id'&&c[3]==='challenge'));
 assert.deepEqual(f.calls.find(c=>c[1]==='in').slice(2),['child_profile_id',['a']]);
});
test('no child profiles skips progress query without inventing participants',async()=>{
 const f=fixture();const result=await readFamilyChallenge(f.client,'challenge',[]);
 assert.deepEqual(result.progress,[]);assert.equal(f.calls.some(c=>c[0]==='from'&&c[1]==='child_challenge_progress'),false);
});
test('missing, mismatched or failed reads reject the entire refresh',async()=>{
 for(const overrides of [{challenges:{data:null,error:null}},{challenges:{data:{id:'other'},error:null}},{challenge_steps:{data:[],error:{message:'denied'}}},{child_challenge_progress:{data:null,error:{message:'offline'}}}])await assert.rejects(readFamilyChallenge(fixture(overrides).client,'challenge',['a']));
});
test('foreign and duplicate child progress cannot become displayed confirmed status',async()=>{
 for(const rows of [[{child_profile_id:'other',status:'completed'}],[{child_profile_id:'a',status:'completed'},{child_profile_id:'a',status:'in_progress'}]])await assert.rejects(readFamilyChallenge(fixture({child_challenge_progress:{data:rows,error:null}}).client,'challenge',['a']));
});
test('removed children are excluded and newly available children are never selected automatically',()=>{
 assert.deepEqual(currentFamilySelection(['a','b','a'],['a','c']),['a']);
 assert.deepEqual(currentFamilySelection([],['a','b']),[]);
 assert.deepEqual(currentFamilySelection(['a'],[]),[]);
});
