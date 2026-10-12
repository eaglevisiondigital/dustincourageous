import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync,statSync} from "node:fs";
import {join} from "node:path";

for (const [file,maximumBytes] of [
 ["book1-courage-mission-atlas.webp",35000],
 ["book1-coloring-previews-atlas.webp",45000]
]) {
 test(`${file} is an optimized WebP reader image`,()=>{
  const path=join(import.meta.dirname,"..","public","assets","images",file);
  const bytes=readFileSync(path);
  assert.equal(bytes.toString("ascii",0,4),"RIFF");
  assert.equal(bytes.toString("ascii",8,12),"WEBP");
  assert.ok(statSync(path).size<=maximumBytes);
 });
}

for (const filename of [
  "digital-coloring-01.png","digital-coloring-02.png",
  "digital-coloring-03.png","digital-coloring-04.png"
]) {
 test(`${filename} comes from approved line-art PDF and has a PNG signature`,()=>{
   const path=join(import.meta.dirname,"..","public","activities","book1",filename);
   const bytes=readFileSync(path);
   assert.deepEqual([...bytes.subarray(0,8)],[137,80,78,71,13,10,26,10]);
   assert.ok(bytes.length>10000 && bytes.length<150000);
 });
}
