import test from 'node:test';
import assert from 'node:assert/strict';
import {
  scriptureScrambleVerses, scrambleTiles, shuffleTileIndices,
  isScriptureScrambleSolved, nextScrambleHint
} from '../src/lib/scriptureScramble.ts';

test('Book 1 Power Verse phrase tiles reconstruct the displayed KJV verse', () => {
  for (const verse of scriptureScrambleVerses) {
    for (const difficulty of ['phrases','medium','words']) {
      const tiles = scrambleTiles(verse,difficulty);
      assert.equal(tiles.join(' '),verse.verse);
      assert.equal(isScriptureScrambleSolved(tiles.map((_,i)=>i),tiles,verse.verse),true);
    }
  }
});

test('duplicate words retain separate tile identities but are validated by verse text', () => {
  const verse=scriptureScrambleVerses[0];
  const tiles=scrambleTiles(verse,'words');
  const indices=tiles.map((_,index)=>index);
  const ofs=tiles.map((word,index)=>word.toLowerCase()==='of'?index:-1).filter(x=>x>=0);
  assert.ok(ofs.length>=2);
  [indices[ofs[0]],indices[ofs[1]]]=[indices[ofs[1]],indices[ofs[0]]];
  assert.equal(isScriptureScrambleSolved(indices,tiles,verse.verse),true);
});

test('incomplete, repeated, invalid, and wrong order cannot be solved', () => {
  const verse=scriptureScrambleVerses[0];
  const tiles=scrambleTiles(verse,'phrases');
  assert.equal(isScriptureScrambleSolved([0],tiles,verse.verse),false);
  assert.equal(isScriptureScrambleSolved([0,0,1,2,3],tiles,verse.verse),false);
  assert.equal(isScriptureScrambleSolved([0,1,2,3,99],tiles,verse.verse),false);
  assert.equal(isScriptureScrambleSolved([1,0,2,3,4],tiles,verse.verse),false);
});

test('scramble order includes every tile once and avoids unchanged ordering', () => {
  for (const size of [2,4,5,26]) {
    const result=shuffleTileIndices(size,()=>.999);
    assert.deepEqual([...result].sort((a,b)=>a-b),Array.from({length:size},(_,i)=>i));
    assert.notDeepEqual(result,Array.from({length:size},(_,i)=>i));
  }
});

test('hint suggests next tile or correction without modifying progress', () => {
  const tiles=scrambleTiles(scriptureScrambleVerses[0],'phrases');
  assert.match(nextScrambleHint([],tiles),/For God hath/);
  assert.match(nextScrambleHint([1],tiles),/Check the order/);
  assert.match(nextScrambleHint([0],tiles),/the spirit/);
});

test('easy medium hard preserve verse text while increasing individual tiles', () => {
 for (const verse of scriptureScrambleVerses) {
  const easy = scrambleTiles(verse,'phrases');
  const medium = scrambleTiles(verse,'medium');
  const hard = scrambleTiles(verse,'words');
  assert.ok(easy.length < medium.length && medium.length < hard.length);
  assert.ok(medium.every(tile => tile.split(/\s+/).length <= 3));
  assert.ok(hard.every(tile => !/\s/.test(tile)));
  for (const tiles of [easy,medium,hard]) assert.equal(tiles.join(' '),verse.verse);
 }
});
