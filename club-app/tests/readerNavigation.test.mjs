import test from "node:test";
import assert from "node:assert/strict";
import { readerKeyPage, readerSwipePage } from "../src/lib/readerNavigation.ts";

test("keyboard reader navigation honors first and last page boundaries", () => {
  assert.equal(readerKeyPage("ArrowLeft", 1, 37, false), null);
  assert.equal(readerKeyPage("ArrowRight", 37, 37, false), null);
  assert.equal(readerKeyPage("ArrowRight", 1, 37, false), 2);
  assert.equal(readerKeyPage("ArrowLeft", 3, 37, false), 2);
  assert.equal(readerKeyPage("Home", 10, 37, false), 1);
  assert.equal(readerKeyPage("End", 10, 37, false), 37);
});
test("busy, enlarged, modified and repeated-key states can block page shortcuts", () => {
  for (const key of ["ArrowLeft", "ArrowRight", "Home", "End"]) assert.equal(readerKeyPage(key, 10, 37, true), null);
  for (const key of ["ArrowUp", "ArrowDown", " ", "Escape", "Tab"]) assert.equal(readerKeyPage(key, 10, 37, false), null);
});
test("a deliberate horizontal swipe turns exactly one page", () => {
  assert.equal(readerSwipePage(-90, 10, 250, 2, 37, false), 3);
  assert.equal(readerSwipePage(90, -10, 250, 2, 37, false), 1);
  assert.equal(readerSwipePage(-90, 10, 250, 37, 37, false), null);
});
test("vertical scrolls, taps, slow drags, invalid values and blocked gestures do not turn pages", () => {
  for (const [dx, dy, time, blocked] of [[20, 0, 100, false], [70, 60, 200, false], [100, 0, 900, false], [100, 0, -1, false], [NaN, 0, 100, false], [100, 0, 100, true]]) {
    assert.equal(readerSwipePage(dx, dy, time, 2, 37, blocked), null);
  }
});
