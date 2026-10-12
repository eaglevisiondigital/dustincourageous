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
