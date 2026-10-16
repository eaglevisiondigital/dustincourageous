import test from "node:test";
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {readFileSync} from "node:fs";
import {join} from "node:path";
const files = [
  {
    "name": "activities-coloring-art.webp",
    "sha256": "ba87fb5f0d894d8a16727d2f41b12caea20163a4c277af5038c0b0c8de7421ab"
  },
  {
    "name": "activities-hero-art.webp",
    "sha256": "670ef0c2e4c84f4d42a3c0eeaacc7edc51de980bf7fbfcfa60d304c503215c08"
  },
  {
    "name": "activities-missions-art.webp",
    "sha256": "ff356c55e6893c4b4886f19ff44f33428a1490ed8e66eac22cfe36da071a9aed"
  },
  {
    "name": "activities-puzzle-art.webp",
    "sha256": "59f30fc66de3a077a1868ffa4607cdf4822d3aa17028a249db37447bcd77d319"
  },
  {
    "name": "activities-scripture-art.webp",
    "sha256": "f446f0ee066f77e905ac187dbea237c86d2423347e08b7968363523bbedb05e9"
  }
];
test("all five locked Activities art crops are installed byte-exact", () => {
  for(const image of files) {
    const bytes=readFileSync(join(import.meta.dirname,"..","public","assets","approved-ui",image.name));
    assert.equal(bytes.toString("ascii",0,4),"RIFF");
    assert.equal(bytes.toString("ascii",8,12),"WEBP");
    assert.equal(createHash("sha256").update(bytes).digest("hex"),image.sha256);
  }
});
