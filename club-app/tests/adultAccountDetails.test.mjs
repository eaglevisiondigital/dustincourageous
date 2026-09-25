import test from 'node:test';
import assert from 'node:assert/strict';
import {readAdultDetails,saveAdultDetails} from '../src/lib/adultSignup.ts';
const details={firstName:' David ',lastName:' Fowler ',cellPhone:'',relationship:'parent',email:'read-only@example.test'};
function fixture({authId='adult',profileError=null,updateError=null,wrongProfile=false}={}){
 const calls=[];let metadata={family_relationship:'guardian',adult_contact_phone:'+1 202 555 0123'};
 const client={auth:{getUser:async()=>({data:{user:{id:authId,email:'adult@example.test',user_metadata:metadata}},error:null}),updateUser:async args=>{calls.push(['auth',args]);metadata={...metadata,...args.data};return {data:{user:{id:authId,user_metadata:metadata}},error:updateError};}},from:table=>{
  calls.push(['table',table]);let updated=null;
  const q={select:()=>q,eq:(key,id)=>{calls.push(['scope',key,id]);return q;},update:data=>{updated=data;calls.push(['profile',data]);return q;},single:async()=>({data:{id:wrongProfile?'other':'adult',first_name:'David',last_name:'Fowler',...updated},error:profileError})};return q;
 }};return {client,calls};
}
test('account details read saved profile names and current adult contact',async()=>{
 const f=fixture();const row=await readAdultDetails(f.client,'adult');assert.equal(row.firstName,'David');assert.equal(row.email,'adult@example.test');assert.equal(row.cellPhone,'+1 202 555 0123');assert.ok(f.calls.some(c=>c[0]==='scope'&&c[2]==='adult'));
});
test('account save updates own profile and explicitly removes optional phone without changing email or roles',async()=>{
 const f=fixture();await saveAdultDetails(f.client,'adult',details);const data=f.calls.find(c=>c[0]==='auth')[1];assert.equal(data.data.adult_contact_phone,null);assert.equal(data.data.family_relationship,'parent');assert.deepEqual(Object.keys(data),['data']);assert.equal('role' in data.data,false);assert.deepEqual(f.calls.find(c=>c[0]==='profile')[1],{first_name:'David',last_name:'Fowler',display_name:'David'});
});
test('changed account identity blocks reads and saves before mutations',async()=>{
 const f=fixture({authId:'other'});await assert.rejects(readAdultDetails(f.client,'adult'));await assert.rejects(saveAdultDetails(f.client,'adult',details));assert.deepEqual(f.calls,[]);
});
test('partial save or unexpected profile never reports complete success',async()=>{
 for(const options of [{profileError:{message:'denied'}},{updateError:{message:'failed'}},{wrongProfile:true}])await assert.rejects(saveAdultDetails(fixture(options).client,'adult',details));
});
test('invalid details fail before any account write',async()=>{
 const f=fixture();await assert.rejects(saveAdultDetails(f.client,'adult',{...details,lastName:' '}));assert.deepEqual(f.calls,[]);
});
