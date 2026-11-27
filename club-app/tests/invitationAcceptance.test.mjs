import test from "node:test";
import assert from "node:assert/strict";
import { createInvitationAcceptor } from "../src/lib/invitationAcceptance.ts";

for(const kind of ["household","organization"])test(`${kind} invitation uses the correct RPC and reuses confirmed acceptance`,async()=>{
  const calls=[];
  const client={async rpc(name,args){calls.push({name,args});return {data:"accepted-id",error:null};}};
  const acceptor=createInvitationAcceptor(client,kind,"invite","fixture-token");
  assert.equal(acceptor.hasAccepted(),false);
  assert.equal(await acceptor.accept(),"accepted-id");
  assert.equal(acceptor.hasAccepted(),true);
  assert.equal(await acceptor.accept(),"accepted-id");
  assert.deepEqual(calls,[{name:`accept_${kind}_invitation`,args:{p_invitation_id:"invite",p_token:"fixture-token"}}]);
});
test("simultaneous clicks share one acceptance request",async()=>{
  let resolve;let count=0;
  const client={rpc(){count++;return new Promise(done=>{resolve=done;});}};
  const acceptor=createInvitationAcceptor(client,"household","invite","token");
  const first=acceptor.accept();const second=acceptor.accept();
  assert.equal(count,1);
  resolve({data:"family",error:null});
  assert.deepEqual(await Promise.all([first,second]),["family","family"]);
});
test("failed acceptance releases pending state for a later retry",async()=>{
  let count=0;
  const client={async rpc(){count++;if(count===1)throw new Error("Unavailable");return {data:"family",error:null};}};
  const acceptor=createInvitationAcceptor(client,"household","invite","token");
  await assert.rejects(acceptor.accept());assert.equal(acceptor.hasAccepted(),false);
  assert.equal(await acceptor.accept(),"family");assert.equal(count,2);
});
test("missing acceptance confirmation or server error never grants success",async()=>{
  for(const response of [{data:null,error:null},{data:"",error:null},{data:"family",error:new Error("Expired")}]){
    const acceptor=createInvitationAcceptor({async rpc(){return response;}},"household","invite","token");
    await assert.rejects(acceptor.accept());assert.equal(acceptor.hasAccepted(),false);
  }
});
