import test from 'node:test';
import assert from 'node:assert/strict';
import {markLoadedNotificationsRead} from '../src/lib/familyActions.ts';
const item=(id,status='unread',user_id='adult')=>({id,status,user_id});
function fixture(data,error=null){const calls=[];const q={update(value){calls.push(['update',value]);return q;},eq(...args){calls.push(['eq',...args]);return q;},in(...args){calls.push(['in',...args]);return q;},select:async()=>({data,error})};return {calls,from(){return q;}};}
test('bulk read targets only loaded unread IDs and the current owner',async()=>{
 const c=fixture([item('a','read')]);assert.deepEqual(await markLoadedNotificationsRead(c,'adult',[item('a'),item('a'),item('b','read')]),{confirmed:['a'],unconfirmed:[]});
 assert.deepEqual(c.calls.find(x=>x[0]==='in'),['in','id',['a']]);assert.ok(c.calls.some(x=>x[0]==='eq'&&x[1]==='user_id'&&x[2]==='adult'));assert.ok(c.calls.some(x=>x[0]==='eq'&&x[1]==='status'&&x[2]==='unread'));
});
test('empty or already read inbox performs no update',async()=>{
 for(const items of [[],[item('a','read')]]){const c=fixture([]);assert.deepEqual(await markLoadedNotificationsRead(c,'adult',items),{confirmed:[],unconfirmed:[]});assert.deepEqual(c.calls,[]);}
});
test('foreign input blocks the entire bulk request before writes',async()=>{
 const c=fixture([]);await assert.rejects(markLoadedNotificationsRead(c,'adult',[item('a'),item('b','unread','other')]));assert.deepEqual(c.calls,[]);
});
test('partial confirmations keep missing read statuses explicitly unconfirmed',async()=>{
 assert.deepEqual(await markLoadedNotificationsRead(fixture([item('a','read')]),'adult',[item('a'),item('b')]),{confirmed:['a'],unconfirmed:['b']});
});
test('invalid, foreign and duplicate response rows never imply bulk success',async()=>{
 for(const rows of [[item('other','read')],[item('a','read','other')],[item('a')],[item('a','read'),item('a','read')]])await assert.rejects(markLoadedNotificationsRead(fixture(rows),'adult',[item('a')]));
 await assert.rejects(markLoadedNotificationsRead(fixture(null,{message:'offline'}),'adult',[item('a')]));
});
