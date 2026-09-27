import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import vm from 'node:vm';
import { handoffCheckout } from '../../supabase/functions/commerce-checkout/handoff.ts';
const source=readFileSync(new URL('../../supabase/functions/commerce-checkout/index.ts',import.meta.url),'utf8');
const code=stripTypeScriptTypes(source.replace(/^import .*;\r?\n/gm,''));
function fixture({configured=true,foreign=false,claimError=false}={}) {
 let handler;const calls=[];
 const session={checkout_session_id:'s1',order_id:'o1',user_id:foreign?'foreign':'guardian',household_id:'h1',checkout_status:'created',expires_at:new Date(Date.now()+60000).toISOString(),total_cents:123,subtotal_cents:123,discount_cents:0,currency:'USD',order_number:1};
 const user={auth:{async getUser(){return {data:{user:{id:'guardian'}}};}},from(table){const q={select(){return q;},eq(){return q;},async single(){return {data:session};},async order(){return {data:[{quantity:1,unit_price_cents:123}]};}};return q;},async rpc(name,args){calls.push(name);return name==='claim_checkout_provider_handoff'?{error:claimError?{message:'SECRET'}:null,data:[{attempt_id:'attempt',disposition:'invoke_adapter'}]}:{error:null};}};
 const admin={async rpc(name,args){calls.push(name);assert.equal(JSON.stringify(args).includes('SECRET'),false);assert.equal(JSON.stringify(args).includes('checkout_url'),false);return {error:null};}};
 const env={SUPABASE_URL:'https://local.invalid',SUPABASE_PUBLISHABLE_KEYS:'{"default":"public"}',SUPABASE_SECRET_KEYS:'{"default":"server"}',DC_COMMERCE_PROVIDER:configured?'webhook':'',DC_COMMERCE_CHECKOUT_ADAPTER_URL:'https://adapter.invalid',DC_COMMERCE_CHECKOUT_ADAPTER_SECRET:'SECRET'};
 const adapter=async(url,request)=>{calls.push('adapter');assert.equal(request.headers.Authorization,'Bearer SECRET');return new Response(JSON.stringify({provider_checkout_id:'ref',checkout_url:'https://provider.invalid/'}));};
 // The receipt fields are necessarily private service arguments; telemetry must
 // never contain the URL or adapter secret. Route receipt separately for checks.
 const server={async rpc(name,args){if(name==='record_checkout_handoff_result'){calls.push(name);assert.equal(JSON.stringify(args).includes('SECRET'),false);return {error:null};}return admin.rpc(name,args);}};
 vm.runInNewContext(code,{Response,URL,createClient:(_url,key)=>key==='public'?user:server,handoffCheckout:input=>handoffCheckout(input,adapter),Deno:{env:{get:key=>env[key]},serve:fn=>{handler=fn;}}});
 return {calls,send:async()=>{const r=await handler(new Request('https://local.invalid/checkout',{method:'POST',headers:{Authorization:'Bearer synthetic-user'},body:JSON.stringify({checkout_session_id:'s1'})}));return {status:r.status,body:await r.json()};}};
}
test('actual checkout Edge handler claims before adapter and finalizes before browser response',async()=>{const f=fixture();assert.equal((await f.send()).status,200);assert.deepEqual(f.calls.slice(0,4),['claim_checkout_provider_handoff','adapter','record_checkout_handoff_result','begin_checkout_provider_handoff']);});
test('unconfigured actual Edge handler never claims or invokes adapter',async()=>{const f=fixture({configured:false});assert.equal((await f.send()).status,409);assert.equal(f.calls.includes('adapter'),false);assert.equal(f.calls.includes('claim_checkout_provider_handoff'),false);});
test('actual Edge handler rejects foreign session before any handoff',async()=>{const f=fixture({foreign:true});assert.equal((await f.send()).status,404);assert.deepEqual(f.calls,[]);});
test('actual Edge handler claim failure has no external call or secret disclosure',async()=>{const f=fixture({claimError:true});const r=await f.send();assert.equal(r.status,409);assert.equal(f.calls.includes('adapter'),false);assert.equal(JSON.stringify(r).includes('SECRET'),false);});
