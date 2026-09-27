import test from 'node:test';
import assert from 'node:assert/strict';
import {createClient} from '@supabase/supabase-js';
import {readFamilyActivityPage} from '../src/lib/familyActivityHistory.ts';
const home='11111111-1111-4111-8111-111111111111', child='22222222-2222-4222-8222-222222222222';
const row={id:42,household_id:home,child_profile_id:child,title:'Family Faith Completed',description:null,created_at:'2026-09-25T13:00:00.123456+00:00',xp_delta:0};
function fixture(data,status=200){const urls=[];const client=createClient('https://history.example.test','test-key',{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{fetch:async url=>{urls.push(new URL(url));return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});}}});return {client,urls};}
test('history scopes both household and child and requests no internal metadata',async()=>{
 const f=fixture([row]);const page=await readFamilyActivityPage(f.client,home,[child,child]);assert.deepEqual(page.items,[row]);assert.equal(page.next,null);
 assert.equal(f.urls[0].searchParams.get('household_id'),'eq.'+home);assert.equal(f.urls[0].searchParams.get('child_profile_id'),`in.(${child})`);assert.ok(!f.urls[0].searchParams.get('select').includes('metadata'));
});
test('history uses lookahead and preserves microseconds and numeric IDs across tied timestamps',async()=>{
 const f=fixture(Array.from({length:21},(_,i)=>({...row,id:100-i})));const page=await readFamilyActivityPage(f.client,home,[child]);assert.equal(page.items.length,20);assert.deepEqual(page.next,{id:81,created_at:row.created_at});
 const second=fixture([{...row,id:80}]);await readFamilyActivityPage(second.client,home,[child],page.next);assert.equal(second.urls[0].searchParams.get('or'),`(created_at.lt.${row.created_at},and(created_at.eq.${row.created_at},id.lt.81))`);
});
test('history rejects foreign households, children and malformed records rather than showing them',async()=>{
 for(const change of [{household_id:child},{child_profile_id:home},{id:Number.MAX_SAFE_INTEGER+1},{created_at:'bad'},{title:null},{xp_delta:'5'}])await assert.rejects(readFamilyActivityPage(fixture([{...row,...change}]).client,home,[child]));
 await assert.rejects(readFamilyActivityPage(fixture({message:'Denied'},403).client,home,[child]));
});
test('empty selection makes no request and unsafe cursors cannot reach filters',async()=>{
 const f=fixture([]);assert.deepEqual(await readFamilyActivityPage(f.client,home,[]),{items:[],next:null});
 for(const cursor of [{id:1,created_at:'now),id.gt.0'},{id:-1,created_at:row.created_at}])await assert.rejects(readFamilyActivityPage(f.client,home,[child],cursor));assert.equal(f.urls.length,0);
});
