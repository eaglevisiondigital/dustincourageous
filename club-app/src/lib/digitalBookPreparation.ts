import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types/database";

export type BookPageUpload = { file: File; alt: string };
const extensions: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };

export function buildDigitalBookManifest(bookId: string, revision: string, entries: BookPageUpload[]) {
  if (!/^[0-9a-f-]{36}$/.test(bookId) || !/^[a-z0-9][a-z0-9-]{0,63}$/.test(revision)) throw new Error("Invalid book or edition revision.");
  if (!entries.length || entries.length > 300) throw new Error("Choose between 1 and 300 pages.");
  if (entries.reduce((sum, item) => sum + item.file.size, 0) > 536870912) throw new Error("Keep each book preparation below 512 MB.");
  return { revision, pages: entries.map((item, index) => {
    const extension = extensions[item.file.type];
    if (!extension || !item.file.size || item.file.size > 20971520) throw new Error(`Page ${index + 1} must be a PNG, JPG or WebP image up to 20 MB.`);
    if (!item.alt.trim() || item.alt.trim().length > 10000 || item.alt.includes(String.fromCharCode(8212))) throw new Error(`Check page ${index + 1}'s description and text. Use 1 to 10,000 characters and no em dash.`);
    return { path: `${bookId}/${revision}/${String(index + 1).padStart(3, "0")}.${extension}`, alt: item.alt.trim() };
  }) };
}

async function sameBytes(left: Blob, right: Blob) {
  if (left.size !== right.size) return false;
  const hashes = await Promise.all([left, right].map(async blob => new Uint8Array(await crypto.subtle.digest("SHA-256", await blob.arrayBuffer()))));
  return hashes[0].every((byte, index) => byte === hashes[1][index]);
}

export async function prepareDigitalBook(client: SupabaseClient<Database>, bookId: string, revision: string,
  entries: BookPageUpload[], uploaded: Set<string>, onProgress: (count: number) => void, isActive: () => boolean = () => true) {
  const manifest = buildDigitalBookManifest(bookId, revision, entries);
  const bucket = client.storage.from("dc-digital-books");
  for (const [index, page] of manifest.pages.entries()) {
    if (!isActive()) throw new Error("Preparation stopped.");
    if (!uploaded.has(page.path)) {
      const { error } = await bucket.upload(page.path, entries[index].file, { upsert: false, contentType: entries[index].file.type, cacheControl: "0" });
      if (error) {
        // A prior upload may have succeeded before its response was interrupted.
        // Never overwrite approved-path bytes or accept an unrelated existing file.
        const existing = await bucket.download(page.path);
        if (existing.error || !existing.data || !await sameBytes(entries[index].file, existing.data)) throw error;
      }
      uploaded.add(page.path);
    }
    onProgress(index + 1);
  }
  if (!isActive()) throw new Error("Preparation stopped.");
  const result = await client.rpc("admin_prepare_digital_book", { p_book_id: bookId, p_manifest: manifest });
  if (result.error) throw result.error;
  if (result.data !== revision) throw new Error("Edition preparation could not be confirmed. Retry this preparation.");
  return manifest;
}
