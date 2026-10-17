import test from "node:test";
import assert from "node:assert/strict";
import { readFamilyProgress } from "../src/lib/familyProgress.ts";
import { readTrophyData } from "../src/lib/trophyData.ts";
import { readParentChildSnapshot } from "../src/lib/parentChildSnapshot.ts";

function clientFixture(responses, rpcResponse) {
  const calls=[];
  return { calls,
    from(table) {
      const query={table,filters:[]};calls.push(query);
      const chain={select(){return chain;},eq(key,value){query.filters.push([key,value]);return chain;},
        in(key,value){query.filters.push([key,value]);return chain;},order(){return chain;},limit(){return chain;},maybeSingle(){return chain;},
        then(resolve,reject){return Promise.resolve(responses[table] ?? {data:[],error:null}).then(resolve,reject);}};
      return chain;
    },
    async rpc(name,args){calls.push({rpc:name,args});return typeof rpcResponse==="function"?rpcResponse(name,args):rpcResponse??{data:[],error:null};}
  };
}
const summary=(id="child",household="family")=>({child_profile_id:id,household_id:household,display_name:"Sam",total_xp:20,weekly_stars:1,lifetime_badges:0,completed_challenges:2,verses_memorized:0,devotional_days_completed:0,books_completed:0,unlocked_rewards:0});
const bookSummary={total_steps:5,required_steps:3,completed_steps:1,completed_required_steps:1,progress_percent:20,ready_for_adventure_completion:false};
function familyResponses(){return {
  parent_child_progress_summary:{data:[summary(),summary("archived")],error:null},
  child_profiles:{data:[{id:"child"}],error:null},
  books:{data:{id:"book",book_number:1,title:"Book"},error:null}
};}
test("family overview uses active household children and excludes archived profiles",async()=>{
  const client=clientFixture(familyResponses(),{data:[bookSummary],error:null});
  const result=await readFamilyProgress(client,"family");
  assert.deepEqual(result.summaries,[summary()]);
  assert.deepEqual(result.bookProgress,{child:bookSummary});
  assert.deepEqual(client.calls.filter(call=>call.table==="child_profiles")[0].filters,[["household_id","family"],["status","active"]]);
  assert.deepEqual(client.calls.filter(call=>call.rpc),[{rpc:"get_child_book_adventure_summary",args:{p_child_profile_id:"child",p_book_id:"book"}}]);
});
for(const table of ["parent_child_progress_summary","child_profiles","books"])test(`failed ${table} read cannot produce an empty family`,async()=>{
  const responses=familyResponses();responses[table]={data:null,error:new Error("Unavailable")};
  await assert.rejects(readFamilyProgress(clientFixture(responses),"family"));
});
test("wrong-household, missing, and duplicate summaries fail closed",async()=>{
  for(const rows of [[summary("child","other")],[],[summary(),summary()]]){
    const responses=familyResponses();responses.parent_child_progress_summary.data=rows;
    await assert.rejects(readFamilyProgress(clientFixture(responses),"family"));
  }
});
test("book progress failures stay explicit while preserving family totals",async()=>{
  for(const response of [{data:null,error:new Error("Unavailable")},{data:[],error:null}]){
    const result=await readFamilyProgress(clientFixture(familyResponses(),response),"family");
    assert.deepEqual(result.summaries,[summary()]);assert.deepEqual(result.bookErrors,{child:true});assert.deepEqual(result.bookProgress,{});
  }
});
test("one child's book failure does not hide another child's result",async()=>{
  const responses=familyResponses();responses.child_profiles.data.push({id:"sibling"});responses.parent_child_progress_summary.data.push(summary("sibling"));
  const result=await readFamilyProgress(clientFixture(responses,(_,args)=>args.p_child_profile_id==="child"?{data:[bookSummary],error:null}:Promise.reject(new Error("Disconnected"))),"family");
  assert.deepEqual(result.bookErrors,{sibling:true});assert.deepEqual(result.bookProgress,{child:bookSummary});
});
test("family with no active children is a confirmed empty state",async()=>{
  const responses=familyResponses();responses.child_profiles.data=[];responses.parent_child_progress_summary.data=[];
  const client=clientFixture(responses);const result=await readFamilyProgress(client,"family");
  assert.deepEqual(result.summaries,[]);assert.equal(client.calls.some(call=>call.rpc),false);
});
test("no published book does not block family totals",async()=>{
  const responses=familyResponses();responses.books.data=null;
  const result=await readFamilyProgress(clientFixture(responses),"family");
  assert.equal(result.book,null);assert.deepEqual(result.bookErrors,{});
});
const trophyTables=["child_level_progress","child_token_totals","child_series_streak_status","child_active_streak_badges","badge_awards","streak_badge_earnings"];
test("every Trophy Room query is scoped to its child",async()=>{
  const client=clientFixture({});await readTrophyData(client,"child-a");
  for(const call of client.calls.filter(call=>call.table))assert.ok(call.filters.some(([key,value])=>key==="child_profile_id"&&value==="child-a"));
  assert.deepEqual(client.calls.find(call=>call.rpc).args,{p_child_profile_id:"child-a"});
});
for(const table of trophyTables)test(`Trophy Room rejects failed ${table} reads`,async()=>{
  await assert.rejects(readTrophyData(clientFixture({[table]:{data:null,error:new Error("Unavailable")}}),"child"));
});
test("failed or missing achievement data cannot become an empty trophy collection",async()=>{
  for(const result of [{data:null,error:new Error("Unavailable")},{data:null,error:null}])await assert.rejects(readTrophyData(clientFixture({},result),"child"));
});
test("progress loaders reject missing scope before querying",async()=>{
  const client=clientFixture({});await assert.rejects(readFamilyProgress(client,""));await assert.rejects(readTrophyData(client,""));assert.deepEqual(client.calls,[]);
});
const countedTables=["badge_awards","child_active_streak_badges","child_scripture_progress","child_devotional_progress","child_book_progress"];
function snapshotResponses(){return Object.fromEntries(countedTables.map(table=>[table,{data:null,count:0,error:null}]));}
test("child snapshot accepts confirmed zero counts and scopes each query",async()=>{
  const client=clientFixture(snapshotResponses());await readParentChildSnapshot(client,"child-a");
  for(const call of client.calls)assert.ok(call.filters.some(([key,value])=>key==="child_profile_id"&&value==="child-a"));
});
for(const table of countedTables)test(`missing ${table} count cannot display as zero`,async()=>{
  const responses=snapshotResponses();responses[table].count=null;
  await assert.rejects(readParentChildSnapshot(clientFixture(responses),"child"));
});
test("negative or fractional child progress counts fail confirmation",async()=>{
  for(const count of [-1,0.5,NaN,Infinity]){
    const responses=snapshotResponses();responses.badge_awards.count=count;
    await assert.rejects(readParentChildSnapshot(clientFixture(responses),"child"));
  }
});
test("child snapshot rejects missing scope before querying",async()=>{
  const client=clientFixture({});await assert.rejects(readParentChildSnapshot(client,""));assert.deepEqual(client.calls,[]);
});
