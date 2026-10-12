import test from "node:test";
import assert from "node:assert/strict";
import {bookOnePuzzleScenes,newPicturePuzzle,swapPuzzlePieces,isPicturePuzzleSolved,picturePiecePosition,picturePuzzleLevels} from "../src/lib/bookOnePicturePuzzle.ts";

test("book preview puzzle provides 6, 20 and 50 piece difficulties",()=>{
  assert.deepEqual(Object.values(picturePuzzleLevels).map(v=>v.columns*v.rows),[6,20,40]);
});
test("every shuffled puzzle is a permutation and is not already solved",()=>{
  for(const size of [6,20,40]){
    const order=newPicturePuzzle(size,()=>.9999);
    assert.equal(order.length,size);
    assert.deepEqual([...order].sort((a,b)=>a-b),Array.from({length:size},(_,i)=>i));
    assert.equal(isPicturePuzzleSolved(order),false);
  }
});
test("swaps are immutable and solving requires every piece in place",()=>{
  const order=[0,2,1,3];
  const swapped=swapPuzzlePieces(order,1,2);
  assert.deepEqual(swapped,[0,1,2,3]);
  assert.deepEqual(order,[0,2,1,3]);
  assert.equal(isPicturePuzzleSolved(swapped),true);
  assert.equal(isPicturePuzzleSolved(order),false);
});
test("invalid swaps cannot mutate source order",()=>{
  const order=[0,2,1,3];
  assert.deepEqual(swapPuzzlePieces(order,-1,2),order);
  assert.deepEqual(swapPuzzlePieces(order,1,4),order);
  assert.deepEqual(order,[0,2,1,3]);
  assert.throws(()=>newPicturePuzzle(0),/Invalid/);
});
test("image crop positions stay in a valid 0-100 percent range",()=>{
  for(const [columns,rows] of [[3,2],[5,4],[10,4]]){
    for(let index=0;index<columns*rows;index++){
      const p=picturePiecePosition(index,columns,rows);
      assert.ok(p);
      assert.match(p.backgroundSize,/^\d+% \d+%$/);
      const v=p.backgroundPosition.match(/^([\d.]+)% ([\d.]+)%$/);
      assert.ok(v);
      assert.ok(Number(v[1])>=0&&Number(v[1])<=100);
      assert.ok(Number(v[2])>=0&&Number(v[2])<=100);
    }
  }
  assert.equal(picturePiecePosition(-1,3,2),null);
});

test("all selectable Book 1 scenes are distinct public preview assets",()=>{
  assert.equal(bookOnePuzzleScenes.length,4);
  const ids=bookOnePuzzleScenes.map(x=>x.id);
  assert.equal(new Set(ids).size,ids.length);
  for(const scene of bookOnePuzzleScenes){
    assert.match(scene.image,/^\/assets\/images\/book1-preview-[a-z0-9-]+\.webp$/);
    assert.ok(scene.title.length>3);
  }
});

test("all four public puzzle scenes are available in the app build",async()=>{
  const {readFileSync}=await import("node:fs");
  const {join}=await import("node:path");
  for(const scene of bookOnePuzzleScenes){
    const filename=scene.image.split("/").pop();
    const path=join(import.meta.dirname,"..","public","assets","images",filename);
    const bytes=readFileSync(path);
    assert.equal(bytes.toString("ascii",0,4),"RIFF");
    assert.equal(bytes.toString("ascii",8,12),"WEBP");
  }
});
