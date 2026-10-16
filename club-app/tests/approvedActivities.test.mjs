import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
const root=join(import.meta.dirname,"..");
const activities=readFileSync(join(root,"src","components","ActivitiesHub.tsx"),"utf8");
const scramble=readFileSync(join(root,"src","components","ScriptureScramble.tsx"),"utf8");
const bookone=readFileSync(join(root,"src","components","BookOneActivityZone.tsx"),"utf8");
const style=readFileSync(join(root,"src","approved-activities.css"),"utf8");
test("approved Activities screen retains exactly four featured working game destinations",()=>{
  for(const name of ["Scripture Scramble","Courage Missions","Picture Puzzle","Coloring Headquarters"])assert.match(activities,new RegExp(name));
  for(const key of ["scripture","missions","puzzles","coloring"])assert.match(activities,new RegExp('openFeatured\\("'+key+'"\\)'));
});
test("launch choices feed real game initial state, not simulated progress",()=>{
  assert.match(activities,/initialDifficulty=\{scrambleDifficulty\}/);
  assert.match(activities,/initialPuzzleLevel=\{puzzleLevel\}/);
  assert.match(scramble,/useState<ScriptureScrambleDifficulty>\(initialDifficulty\)/);
  assert.match(bookone,/useState<PicturePuzzleLevel>\(initialLevel\)/);
  assert.match(activities,/setActivityZone\(zone\)/);
});
test("locked screenshot aesthetic does not replace protected completion controls",()=>{
  assert.match(activities,/await completeActivity\(supabase,childId,item.id\)/);
  assert.match(activities,/onProgress\(\)/);
  assert.match(activities,/roleLower = familyRoleLower\(relationship\)/);
  assert.match(style,/\.dc-approved-skin \.dc-approved-activity-card/);
});
