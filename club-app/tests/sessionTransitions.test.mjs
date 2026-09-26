import test from 'node:test';
import assert from 'node:assert/strict';
import {preservesFamilyWorkspace} from '../src/lib/sessionTransitions.ts';
test('same-adult token refresh, metadata update and repeated sign-in preserve mounted workspace',()=>{
 for(const event of ['TOKEN_REFRESHED','USER_UPDATED','SIGNED_IN'])assert.equal(preservesFamilyWorkspace('adult-a','adult-a',event),true);
});
test('different adults always replace the workspace even for routine event names',()=>{
 for(const event of ['TOKEN_REFRESHED','USER_UPDATED','SIGNED_IN'])assert.equal(preservesFamilyWorkspace('adult-a','adult-b',event),false);
});
test('initial sessions, sign-outs, recovery and unknown events retain full transition behavior',()=>{
 for(const event of ['INITIAL_SESSION','SIGNED_OUT','PASSWORD_RECOVERY','MFA_CHALLENGE_VERIFIED','unknown'])assert.equal(preservesFamilyWorkspace('adult-a','adult-a',event),false);
});
test('missing session identity never preserves previous family state',()=>{
 for(const event of ['TOKEN_REFRESHED','USER_UPDATED','SIGNED_IN'])for(const pair of [[null,'adult-a'],['adult-a',null],[null,null],['','']])assert.equal(preservesFamilyWorkspace(...pair,event),false);
});
