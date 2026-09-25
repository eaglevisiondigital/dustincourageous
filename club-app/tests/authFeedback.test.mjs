import test from 'node:test';
import assert from 'node:assert/strict';
import {authFeedback,authIsRateLimited,emailRetrySeconds} from '../src/lib/authFeedback.ts';
test('rate limits use actionable guidance without claiming delivery',()=>{
 for(const error of [{code:'over_email_send_rate_limit'},{code:'over_request_rate_limit'},{status:429}]){assert.equal(authIsRateLimited(error),true);assert.match(authFeedback(error),/wait/);assert.match(authFeedback(error),/spam/);}
 assert.equal(authIsRateLimited({code:'invalid_credentials'}),false);
});
test('unconfirmed sign-in and incorrect credentials have distinct recovery guidance',()=>{
 assert.match(authFeedback({code:'email_not_confirmed'}),/confirmation email below/);
 assert.match(authFeedback({code:'invalid_credentials'}),/Forgot Password/);
});
test('unexpected server messages are not exposed and never report success',()=>{
 const message=authFeedback({message:'internal server details secret'});assert.ok(!message.includes('secret'));assert.match(message,/could not complete/);
});
test('email retry time rounds up and expires without negative values',()=>{
 assert.equal(emailRetrySeconds(60000,0),60);assert.equal(emailRetrySeconds(60000,59001),1);assert.equal(emailRetrySeconds(60000,60000),0);assert.equal(emailRetrySeconds(60000,61000),0);
});
