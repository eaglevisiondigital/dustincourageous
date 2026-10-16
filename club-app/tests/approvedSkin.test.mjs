import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");
const source = readFileSync(join(root, "src", "App.tsx"), "utf8");
const skin = readFileSync(join(root, "src", "approved-skin.css"), "utf8");
const entry = readFileSync(join(root, "src", "main.tsx"), "utf8");

test("locked approved skin is applied only to Kid View", () => {
  assert.match(source, /view === "kid" \? "app-shell kid-experience-v2 dc-approved-skin" : "app-shell"/);
  assert.match(entry, /import "\.\/approved-skin\.css"/);
  assert.match(skin, /\.dc-approved-skin \.app-header/);
});

test("kid navigation appears once in the working header", () => {
  const header = source.slice(source.indexOf('<header className="app-header">'), source.indexOf('<div className="app-body">'));
  const inMain = source.slice(source.indexOf('<main className="portal-main">'));
  assert.match(header, /view === "kid" && \(<nav className="kid-subnav"/);
  assert.doesNotMatch(inMain, /aria-label="Kid area"/);
  for (const id of ["home", "bible", "books", "activities", "trophies"]) {
    assert.match(header, new RegExp('setKidSection\\("' + id + '"\\)'));
  }
});

test("approved hero remains personalized and never embeds static test names or mock progress", () => {
  assert.match(source, /dc-approved-name/);
  assert.match(source, /selectedChild\?\.display_name/);
  assert.match(source, /snapshot\.xp/);
  assert.match(source, /snapshot\.badges/);
  assert.match(source, /dc-approved-actions/);
  assert.match(source, /challenges\.length \? showChallenge/);
  assert.doesNotMatch(skin, /Sally|QA Comet|QA Nova/);
});

test("only exact approved screenshot crops, not full screen pictures, are reused for artwork", () => {
  for (const name of ["home-hero-art.webp","adventure-sidebar-path.webp","faith-courage-victory.webp"]) {
    const file = join(root, "public", "assets", "approved-ui", name);
    const bytes = readFileSync(file);
    assert.equal(bytes.toString("ascii", 0, 4), "RIFF");
    assert.equal(bytes.toString("ascii", 8, 12), "WEBP");
    assert.ok(bytes.length > 5000 && bytes.length < 300000);
    assert.match(skin + source, new RegExp(name.replace(/\./g, '\\.')));
  }
});


test("approved three-shield hero art keeps its landscape ratio and cannot push greeting off-screen",()=>{
  const patch = skin.slice(skin.indexOf("/* Exact-reference Adventure Home visual correction: October 16, 2026 */"));
  assert.ok(patch.length > 500, "visual correction block present");
  assert.match(patch, /\.kid-hero-motto img\.dc-approved-motto \{/);
  assert.match(patch, /aspect-ratio:\s*324\s*\/\s*122/);
  assert.match(patch, /max-height:\s*115px/);
  assert.match(patch, /overflow-wrap:\s*anywhere/);
  assert.match(patch, /\.kid-adventure-hero:before \{ display: none; \}/);
});

test("approved sidebar scenic artwork is cropped without repeating child names",()=>{
  const patch=skin.slice(skin.indexOf("/* Exact-reference Adventure Home visual correction: October 16, 2026 */"));
  assert.match(patch, /height:\s*min\(586px,\s*100%\)/);
  assert.match(patch, /adventure-sidebar-path\.webp/);
  assert.match(patch, /\.side-panel::after/);
});

test("Book 1 cover uses natural proportions and selected child's greeting is dynamic",()=>{
  assert.match(skin, /\.continue-book-cover img \{[\s\S]*?aspect-ratio:\s*auto/);
  assert.match(source, /selectedChild\?\.display_name/);
  assert.doesNotMatch(source, /Hey,\s*Sally!/);
});

test("October 16 hero refinement is decoration behind dynamic text only", () => {
  const marker = "October 16 founder-approved refinement: LEFT HERO BACKGROUND ONLY";
  const block = skin.slice(skin.indexOf(marker));
  assert.ok(block.length > 500, "approved limited treatment exists");
  assert.match(block, /kid-adventure-hero-copy::before/);
  assert.match(block, /kid-adventure-hero-copy::after/);
  assert.match(block, /rgba\(5,28,64,\.98\)/);
  assert.match(block, /kid-adventure-hero-copy > \*/);
  assert.match(source, /selectedChild\?\.display_name/);
  assert.doesNotMatch(source, /dustin_s_courageous_adventure_club\.png/);
});
