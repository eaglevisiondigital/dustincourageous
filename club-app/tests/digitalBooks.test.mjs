import test from "node:test";
import assert from "node:assert/strict";
import { parseDigitalBook, getDigitalBook, downloadDigitalPage, saveDigitalBookPosition } from "../src/lib/digitalBooks.ts";
import { buildDigitalBookManifest, prepareDigitalBook } from "../src/lib/digitalBookPreparation.ts";

const id = "11111111-1111-4111-8111-111111111111";
const ready = () => ({ availability: "ready", revision: "edition-1", page_number: 1, pages: [{ path: `${id}/edition-1/001.png`, alt: "Approved page description" }] });
function clientFixture({ manifest = ready(), blob = new Blob(["page"], { type: "image/png" }), save = 1, error = null, uploadError = null } = {}) {
  const calls = [];
  return { calls, async rpc(name, args) { calls.push({ name, args }); return { data: name === "get_digital_book" ? manifest : name === "admin_prepare_digital_book" ? args.p_manifest.revision : save, error }; },
    storage: { from(bucket) { return { async download(path) { calls.push({ bucket, download: path }); return { data: blob, error: null }; },
      async upload(path, file, options) { calls.push({ bucket, upload: path, file, options }); return { error: uploadError }; } }; } } };
}
test("locked and unavailable responses never expose page data", () => {
  for (const availability of ["locked", "unavailable"]) assert.deepEqual(parseDigitalBook({ ...ready(), availability }, id), { availability });
});
test("reader rejects malformed manifests, external paths, traversal, duplicate pages, and invalid positions", () => {
  const bad = [null, {}, { ...ready(), page_number: 0 }, { ...ready(), page_number: 2 }, { ...ready(), revision: "../bad" }, { ...ready(), pages: [] },
    ...["https://example.com/page.png", `${id}/edition-1/../page.png`, `${id}/edition-2/page.png`, `${id}/edition-1/page.svg`].map(path => ({ ...ready(), pages: [{ path, alt: "Page" }] })),
    { ...ready(), pages: [...ready().pages, ...ready().pages] }, { ...ready(), pages: [{ ...ready().pages[0], alt: "" }] }];
  for (const value of bad) assert.throws(() => parseDigitalBook(value, id));
  assert.deepEqual(parseDigitalBook(ready(), id), ready());
});
test("availability checks always send the selected child and book", async () => {
  const client = clientFixture(); await getDigitalBook(client, "child-a", id);
  assert.deepEqual(client.calls[0].args, { p_child_profile_id: "child-a", p_book_id: id });
  await assert.rejects(getDigitalBook(clientFixture({ error: new Error("Unavailable") }), "child-a", id));
});
test("every page request rechecks child access before downloading private bytes", async () => {
  const client = clientFixture(); const blob = await downloadDigitalPage(client, "child-a", id, ready(), 1);
  assert.equal(blob.type, "image/png");
  assert.deepEqual(client.calls.map(call => call.name ?? call.bucket), ["get_digital_book", "dc-digital-books"]);
  assert.equal(client.calls[1].download, ready().pages[0].path);
});
test("revoked access and changed editions cannot download stale pages", async () => {
  for (const manifest of [{ availability: "locked" }, { availability: "unavailable" }, { ...ready(), revision: "edition-2", pages: [{ path: `${id}/edition-2/001.png`, alt: "Page" }] }]) {
    const client = clientFixture({ manifest }); await assert.rejects(downloadDigitalPage(client, "child-a", id, ready(), 1));
    assert.equal(client.calls.some(call => call.download), false);
  }
});
test("page bounds and non-image or empty responses fail closed", async () => {
  for (const page of [0, 2, 1.5]) { const client = clientFixture(); await assert.rejects(downloadDigitalPage(client, "child", id, ready(), page)); assert.equal(client.calls.length, 0); }
  for (const blob of [null, new Blob([], { type: "image/png" }), new Blob(["html"], { type: "text/html" })]) await assert.rejects(downloadDigitalPage(clientFixture({ blob }), "child", id, ready(), 1));
});
test("saved reading place requires exact server confirmation and carries the edition", async () => {
  const client = clientFixture(); await saveDigitalBookPosition(client, "child", id, "edition-1", 1);
  assert.deepEqual(client.calls[0], { name: "save_digital_book_position", args: { p_child_profile_id: "child", p_book_id: id, p_revision: "edition-1", p_page_number: 1 } });
  for (const save of [null, false, 2]) await assert.rejects(saveDigitalBookPosition(clientFixture({ save }), "child", id, "edition-1", 1));
});
const entries = () => [{ file: new File(["page"], "first.png", { type: "image/png" }), alt: "Page text" }];
test("preparation preserves page order and generates revision-specific paths", () => {
  const manifest = buildDigitalBookManifest(id, "edition-1", [...entries(), { file: new File(["spread"], "spread.jpg", { type: "image/jpeg" }), alt: "Spread text" }]);
  assert.deepEqual(manifest.pages.map(page => page.path), [`${id}/edition-1/001.png`, `${id}/edition-1/002.jpg`]);
});
test("preparation validates all input before any upload", async () => {
  for (const input of [[], [{ ...entries()[0], alt: "" }], [{ ...entries()[0], alt: "Bad" + String.fromCharCode(8212) + "style" }], [{ file: new File(["pdf"], "book.pdf", { type: "application/pdf" }), alt: "Page" }]]) {
    const client = clientFixture(); await assert.rejects(prepareDigitalBook(client, id, "edition-1", input, new Set(), () => {})); assert.equal(client.calls.length, 0);
  }
});
test("admin preparation uploads without overwriting and only stages a draft", async () => {
  const client = clientFixture(); const progress = [];
  await prepareDigitalBook(client, id, "edition-1", entries(), new Set(), count => progress.push(count));
  assert.equal(client.calls[0].options.upsert, false);
  assert.equal(client.calls[1].name, "admin_prepare_digital_book"); assert.deepEqual(progress, [1]);
  assert.equal(client.calls.some(call => call.name?.includes("publish")), false);
});
test("interrupted uploads only resume if the existing bytes match", async () => {
  const client = clientFixture({ uploadError: new Error("Conflict") });
  await prepareDigitalBook(client, id, "edition-1", entries(), new Set(), () => {});
  assert.equal(client.calls.at(-1).name, "admin_prepare_digital_book");
  const wrong = clientFixture({ uploadError: new Error("Conflict"), blob: new Blob(["evil"], { type: "image/png" }) });
  await assert.rejects(prepareDigitalBook(wrong, id, "edition-1", entries(), new Set(), () => {}));
  assert.equal(wrong.calls.some(call => call.name === "admin_prepare_digital_book"), false);
});
test("retries reuse confirmed uploads and leaving the screen stops preparation", async () => {
  const client = clientFixture(); const uploaded = new Set([`${id}/edition-1/001.png`]);
  await prepareDigitalBook(client, id, "edition-1", entries(), uploaded, () => {});
  assert.equal(client.calls.length, 1); assert.equal(client.calls[0].name, "admin_prepare_digital_book");
  const stopped = clientFixture(); await assert.rejects(prepareDigitalBook(stopped, id, "edition-1", entries(), new Set(), () => {}, () => false)); assert.equal(stopped.calls.length, 0);
});
