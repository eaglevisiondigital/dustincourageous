import test from "node:test";
import assert from "node:assert/strict";
import { submitSupportRequest } from "../src/lib/supportTicket.ts";

const request={id:"ticket-a",household_id:"family-a",user_id:"guardian-a",category:"general",subject:"Help",message:"Please help",status:"open",priority:"normal"};
const saved={id:"ticket-a",ticket_number:123};
function fixture(reads,insertResult){
  const calls=[];
  return {
    calls,
    from(table){
      const call={table,filters:[]};calls.push(call);
      const query={
        select(){return query;},
        eq(key,value){call.filters.push([key,value]);return query;},
        insert(payload){call.insert=payload;return query;},
        async maybeSingle(){return reads.shift();},
        async single(){return insertResult;}
      };
      return query;
    }
  };
}
test("new support request confirms ticket number and scopes recovery reads",async()=>{
  const client=fixture([{data:null,error:null}],{data:saved,error:null});
  assert.deepEqual(await submitSupportRequest(client,request),saved);
  assert.deepEqual(client.calls[0].filters,[["id","ticket-a"],["household_id","family-a"],["user_id","guardian-a"]]);
  assert.deepEqual(client.calls[1].insert,request);
});
test("retry of a saved support request never inserts again",async()=>{
  const client=fixture([{data:saved,error:null}]);
  assert.deepEqual(await submitSupportRequest(client,request),saved);
  assert.equal(client.calls.length,1);
});
test("dropped insert response recovers the committed ticket",async()=>{
  const client=fixture([{data:null,error:null},{data:saved,error:null}],{data:null,error:{message:"Disconnected"}});
  assert.deepEqual(await submitSupportRequest(client,request),saved);
  assert.equal(client.calls.filter(call=>call.insert).length,1);
});
test("failed initial lookup does not risk another insert",async()=>{
  const client=fixture([{data:null,error:new Error("Unavailable")}]);
  await assert.rejects(submitSupportRequest(client,request));
  assert.equal(client.calls.length,1);
});
test("unconfirmed inserts remain retryable using the original identifier",async()=>{
  const client=fixture([{data:null,error:null},{data:null,error:null}],{data:null,error:{message:"Disconnected"}});
  await assert.rejects(submitSupportRequest(client,request),/could not be confirmed/);
  assert.equal(client.calls[1].insert.id,request.id);
});
