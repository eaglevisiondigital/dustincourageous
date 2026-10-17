import test from "node:test";
import assert from "node:assert/strict";
import {parseColorHex, paintBucketFill} from "../src/lib/digitalColoring.ts";

test("digital coloring palette parses a valid color and rejects unsafe values",()=>{
 assert.deepEqual(parseColorHex("#e13239"),{r:225,g:50,b:57});
 assert.equal(parseColorHex("red"),null);
 assert.equal(parseColorHex("#abc"),null);
 assert.equal(parseColorHex("#12345678"),null);
});
function grid(n=5) {
 const a=new Uint8ClampedArray(n*n*4);
 for(let i=0;i<n*n;i++) {a.set([255,255,255,255],i*4);}
 for(let k=1;k<=3;k++){
  for(const x of [1,3])a.set([0,0,0,255],(k*n+x)*4);
  for(const y of [1,3])a.set([0,0,0,255],(y*n+k)*4);
 }
 return a;
}
test("fill colors enclosed spaces without changing black outlines or exterior",()=>{
 const p=grid();
 const color={r:244,g:98,b:52};
 assert.equal(paintBucketFill(p,5,5,2,2,color),1);
 assert.deepEqual([...p.slice((2*5+2)*4,(2*5+2)*4+4)],[244,98,52,255]);
 assert.deepEqual([...p.slice((1*5+2)*4,(1*5+2)*4+4)],[0,0,0,255]);
 assert.deepEqual([...p.slice(0,4)],[255,255,255,255]);
});
test("clicking a black outline does nothing and cannot recolor it",()=>{
 const p=grid();
 assert.equal(paintBucketFill(p,5,5,1,1,{r:20,g:155,b:20}),0);
 assert.deepEqual([...p.slice((1*5+1)*4,(1*5+1)*4+4)],[0,0,0,255]);
});
test("fill can recolor an existing region and restore it to white",()=>{
 const p=grid(), red={r:224,g:40,b:45},white={r:255,g:255,b:255};
 assert.equal(paintBucketFill(p,5,5,2,2,red),1);
 assert.equal(paintBucketFill(p,5,5,2,2,white),1);
 assert.equal(paintBucketFill(p,5,5,2,2,white),0);
});
test("invalid coordinates, dimensions, and mismatched data are safe no-ops",()=>{
 const p=grid(),red={r:230,g:20,b:20};
 for(const [w,h,x,y] of [[5,5,-1,0],[5,5,5,0],[5,5,2,5],[0,5,0,0],[2,2,0,0]]){
  assert.equal(paintBucketFill(p,w,h,x,y,red),0);
 }
 assert.equal(paintBucketFill(p,5,5,2,2,{r:300,g:40,b:40}),0);
});
