import test from "node:test";
import assert from "node:assert/strict";
import { childProfileInput, householdInput, createOnboardingAttempt, saveOnboardingPin } from "../src/lib/onboarding.ts";

test("child input requires consent and a nonblank nickname", () => {
  assert.throws(() => childProfileInput("Sam", "", false));
  assert.throws(() => childProfileInput("  ", "", true));
  assert.deepEqual(childProfileInput(" Sam ", "", true), { p_display_name: "Sam", p_birth_year: undefined });
});
test("birth year rejects malformed, fractional, historical, and future values", () => {
  for (const value of ["2007", "2027", "2e3", "2020.5", "NaN", "Infinity", "-2020"]) {
    assert.throws(() => childProfileInput("Sam", value, true, 2026));
  }
  assert.equal(childProfileInput("Sam", " 2017 ", true, 2026).p_birth_year, 2017);
});
test("household setup requires consent and a trimmed nonempty name", () => {
  assert.throws(() => householdInput("Family", false, "UTC"));
  assert.throws(() => householdInput(" ", true, "UTC"));
  assert.deepEqual(householdInput(" Our Family ", true, "UTC"), { p_name: "Our Family", p_timezone: "UTC" });
});
test("overlapping creates are blocked before a second request is sent", async () => {
  const attempt = createOnboardingAttempt();
  let resolve; let calls = 0;
  const request = () => { calls++; return new Promise(done => { resolve = done; }); };
  const first = attempt.run(request);
  await assert.rejects(attempt.run(request));
  resolve({ data: "new-id", error: null, status: 200 });
  await first;
  assert.equal(calls, 1);
  assert.equal(attempt.state(), "saved");
});
test("confirmed creates cannot be repeated after a failed UI refresh", async () => {
  const attempt = createOnboardingAttempt();
  await attempt.run(async () => ({ data: "new-id", error: null, status: 200 }));
  await assert.rejects(attempt.run(() => { throw new Error("Must not run"); }));
  assert.equal(attempt.state(), "saved");
});
test("a definite server rejection allows corrected input to be submitted", async () => {
  const attempt = createOnboardingAttempt();
  await assert.rejects(attempt.run(async () => ({ data: null, error: new Error("Rejected"), status: 400 })));
  assert.equal(attempt.state(), "ready");
  await attempt.run(async () => ({ data: "new-id", error: null, status: 200 }));
  assert.equal(attempt.state(), "saved");
});
test("network, server, and timeout failures require checking the family before another create", async () => {
  for (const status of [0, 408, 500, 502, 504]) {
    const attempt = createOnboardingAttempt();
    await assert.rejects(attempt.run(async () => ({ data: null, error: new Error("Unavailable"), status })));
    assert.equal(attempt.state(), "uncertain");
    await assert.rejects(attempt.run(() => { throw new Error("Must not run"); }));
  }
});
test("thrown transport failures and missing IDs never count as successful creation", async () => {
  for (const request of [async () => { throw new Error("Disconnected"); }, async () => ({data: null, error: null, status: 200}), async () => ({data: " ", error: null, status: 200})]) {
    const attempt = createOnboardingAttempt();
    await assert.rejects(attempt.run(request));
    assert.equal(attempt.state(), "uncertain");
  }
});
test("invalid or mismatched PIN never reaches the server", async () => {
  const client = { rpc() { assert.fail("Must not call server"); } };
  for (const [pin, confirm] of [["123", "123"], ["1234567", "1234567"], ["abcd", "abcd"], ["1234", "4567"]]) {
    await assert.rejects(saveOnboardingPin(client, "family", pin, confirm));
  }
});
test("PIN setup confirms the same household before allowing completion", async () => {
  const calls = [];
  const client = { async rpc(name, args) { calls.push({name,args}); return name === "set_guardian_pin" ? {error:null} : {data:[{configured:true}],error:null}; } };
  await saveOnboardingPin(client, "family", "1234", "1234");
  assert.deepEqual(calls, [
    {name:"set_guardian_pin",args:{p_household_id:"family",p_pin:"1234"}},
    {name:"guardian_pin_status",args:{p_household_id:"family"}}
  ]);
});
test("failed PIN save stops before checking status", async () => {
  let calls = 0;
  await assert.rejects(saveOnboardingPin({async rpc(){calls++;return {error:new Error("Denied")};}}, "family", "1234", "1234"));
  assert.equal(calls, 1);
});
test("missing, false, or failed PIN confirmation cannot complete onboarding", async () => {
  for (const response of [{data:[],error:null}, {data:[{configured:false}],error:null}, {data:null,error:new Error("Disconnected")}]) {
    await assert.rejects(saveOnboardingPin({async rpc(name){return name === "set_guardian_pin" ? {error:null} : response;}}, "family", "1234", "1234"));
  }
});
