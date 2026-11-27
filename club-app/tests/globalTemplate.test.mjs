import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {join} from "node:path";
import {parseAdventureEntry,adventureJoinUrl} from "../src/lib/adventureEntry.ts";
const root=join(import.meta.dirname,"..");
const app=readFileSync(join(root,"src","App.tsx"),"utf8");
const template=readFileSync(join(root,"src","global-template.css"),"utf8");
test("QR invitation is display-only and never selects a household or child",()=>{
  assert.deepEqual(parseAdventureEntry("/join","?next=books&household_id=foreign&child_id=foreign"),{join:true,section:"books"});
  assert.deepEqual(parseAdventureEntry("/join","?next=activities"),{join:true,section:"activities"});
  assert.deepEqual(parseAdventureEntry("/join/","?next=bible"),{join:true,section:"bible"});
  assert.deepEqual(parseAdventureEntry("/join","?next=admin"),{join:true,section:"home"});
  assert.deepEqual(parseAdventureEntry("/join","?next=https://evil.test"),{join:true,section:"home"});
  assert.deepEqual(parseAdventureEntry("/invite","?next=books"),{join:false,section:"home"});
  assert.equal(adventureJoinUrl("https://club.example.test","books"),"https://club.example.test/join?next=books");
});
test("one global version is used by all households and all children",()=>{
  assert.match(app,/data-template="dc-global-v1"/);
  assert.match(app,/dc-family-skin/);
  assert.match(app,/dc-approved-skin/);
  assert.match(app,/household\.name/);
  assert.match(app,/children\.map\(\(child\) =>/);
  assert.doesNotMatch(template,/Sally|QA Nova|QA Comet/);
  assert.match(template,/\.dc-family-skin \.parent-hero/);
});
test("parent shows household book access without requesting private book pages",()=>{
  const guide=readFileSync(join(root,"src","components","FamilyAccessOverview.tsx"),"utf8");
  assert.match(guide,/has_book_access/);
  assert.match(guide,/householdId/);
  assert.match(guide,/children\.map/);
  assert.match(guide,/Book Companion Locked/);
  assert.match(guide,/Full digital-book pages require separate publication/);
  assert.doesNotMatch(guide,/service_role|auth\.admin|auth\.users/);
});
test("QR flow retains real Auth, guardian PIN, and RLS-based family access",()=>{
  assert.match(app,/parseAdventureEntry/);
  assert.match(app,/guardian_pin_status/);
  assert.match(app,/\.eq\("user_id", user\.id\)/);
  assert.match(app,/\.eq\("household_id", currentHousehold\.id\)/);
  assert.match(app,/revoke_guardian_unlock_sessions/);
  assert.match(app,/dc_adventure_club_kid_locked/);
});
