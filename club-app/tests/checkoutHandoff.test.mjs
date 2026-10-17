import test from 'node:test';
import assert from 'node:assert/strict';
import { handoffCheckout } from '../../supabase/functions/commerce-checkout/handoff.ts';

function fixture() {
 const calls=[]; let state=null; let receipt=null; let finalized=false;
 const options={claimFail:false,recordFail:false,finalizeFail:false,adapterFail:false,adapterStatus:200,badUrl:false};
 const userClient={async rpc(name,args){
  calls.push({name,args});
  if(name==='claim_checkout_provider_handoff') {
   if(options.claimFail)return {error:{message:'SECRET'},data:null};
   const disposition=finalized?'reuse':receipt?'finalize':state?'awaiting_result':'invoke_adapter';state='claimed';
   return {error:null,data:[{attempt_id:'attempt-1',disposition,provider_checkout_id:receipt?.id??null,checkout_url:receipt?.url??null}]};
  }
  if(options.finalizeFail)return {error:{message:'SECRET'}};
  assert.equal(args.p_provider_checkout_id,receipt.id);finalized=true;return {error:null};
 }};
 const admin={async rpc(name,args){
  calls.push({name,args});
  if(options.recordFail)return {error:{message:'SECRET'}};
  if(args.p_failure_code)state='needs_reconciliation';
  else receipt={id:args.p_provider_checkout_id,url:args.p_checkout_url};
  return {error:null};
 }};
 const input={userClient,admin,sessionId:'session-1',provider:'synthetic',adapterUrl:'https://adapter.invalid',adapterSecret:'SECRET',expiresAt:new Date(Date.now()+60000).toISOString(),payload:{event:'dc.checkout.create',checkout_session_id:'session-1'}};
 const send=async (url,request)=>{
  calls.push({name:'adapter',url,request});
  if(options.adapterFail)throw Error('network SECRET');
  return new Response(JSON.stringify({provider_checkout_id:'ref-1',checkout_url:options.badUrl?'https://SECRET@bad.invalid':'https://provider.invalid/checkout',secret:'SECRET'}),{status:options.adapterStatus});
 };
 return {calls,options,input,send,run:()=>handoffCheckout(input,send),count:()=>calls.filter(x=>x.name==='adapter').length};
}

test('claim precedes adapter; durable receipt precedes authorized finalization',async()=>{
 const f=fixture();const r=await f.run();assert.equal(r.status,200);
 assert.deepEqual(f.calls.map(x=>x.name),['claim_checkout_provider_handoff','adapter','record_checkout_handoff_result','begin_checkout_provider_handoff']);
 const request=f.calls[1].request;assert.equal(request.headers['Idempotency-Key'],'checkout:session-1');
 assert.equal(JSON.parse(request.body).handoff_attempt_id,'attempt-1');assert.equal(request.redirect,'error');
 assert.equal(JSON.stringify(r).includes('SECRET'),false);
});
test('claim denial never reaches adapter',async()=>{const f=fixture();f.options.claimFail=true;assert.equal((await f.run()).status,409);assert.equal(f.count(),0);});
test('successful browser retry reuses the reference without redispatch',async()=>{const f=fixture();const a=await f.run();const b=await f.run();assert.deepEqual(a,b);assert.equal(f.count(),1);});
test('two concurrent Edge requests dispatch at most once',async()=>{const f=fixture();const r=await Promise.all([f.run(),f.run()]);assert.deepEqual(r.map(x=>x.status).sort(),[200,409]);assert.equal(f.count(),1);});
for(const failure of ['adapterFail','adapterStatus','badUrl'])test(`${failure} persists reconciliation and never redispatches on retry`,async()=>{
 const f=fixture();f.options[failure]=failure==='adapterStatus'?502:true;
 const result=await f.run();assert.equal(result.status,409);assert.equal(JSON.stringify(result).includes('SECRET'),false);
 assert.ok(f.calls.some(x=>x.name==='record_checkout_handoff_result'&&x.args.p_failure_code));
 await f.run();assert.equal(f.count(),1);
});
test('provider success plus receipt database failure leaves claim recoverable without duplicate dispatch',async()=>{
 const f=fixture();f.options.recordFail=true;assert.equal((await f.run()).body.code,'handoff_result_pending');
 f.options.recordFail=false;await f.run();assert.equal(f.count(),1);
});
test('receipt survives finalization failure and retry finishes without another adapter call',async()=>{
 const f=fixture();f.options.finalizeFail=true;assert.equal((await f.run()).body.code,'handoff_finalization_pending');
 f.options.finalizeFail=false;assert.equal((await f.run()).status,200);assert.equal(f.count(),1);
});
test('expiry after claim prevents dispatch',async()=>{const f=fixture();f.input.expiresAt=new Date(0).toISOString();assert.equal((await f.run()).body.code,'expired_before_dispatch');assert.equal(f.count(),0);});
