import test from 'node:test';
import assert from 'node:assert/strict';
import {adultSignupMetadata} from '../src/lib/adultSignup.ts';
test('adult signup keeps full name, private contact metadata and selected display relationship',()=>{
 assert.deepEqual(adultSignupMetadata(' David ',' Fowler ',' +1 (850) 555-0123 ','parent'),{first_name:'David',last_name:'Fowler',display_name:'David',adult_contact_phone:'+1 (850) 555-0123',family_relationship:'parent'});
});
test('phone is optional and never configures Auth phone or verified status',()=>{
 const data=adultSignupMetadata('David','Fowler','','guardian');assert.equal(data.family_relationship,'guardian');assert.equal('adult_contact_phone' in data,false);assert.equal('phone' in data,false);assert.equal('phone_verified' in data,false);
});
test('blank names, missing relationship and invalid phone are rejected',()=>{
 for(const args of [[' ','Fowler','','parent'],['David',' ','','guardian'],['David','Fowler','',''],['David','Fowler','123','parent'],['David','Fowler','abc5551234567','parent'],['David','Fowler','1'.repeat(16),'parent']])assert.throws(()=>adultSignupMetadata(...args));
});
test('adult leader registration does not assert a family relationship',()=>{
 assert.equal('family_relationship' in adultSignupMetadata('Anne-Marie',"O’Brien",'','',true),false);
});
