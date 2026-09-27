import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types/database";

export type DigitalPage = { path: string; alt: string };
export type ReadyDigitalBook = { availability: "ready"; revision: string; pages: DigitalPage[]; page_number: number };
export type DigitalBook = ReadyDigitalBook | { availability: "locked" | "unavailable" };

export function parseDigitalBook(value: unknown, bookId: string): DigitalBook {
  if (!value || typeof value !== "object") throw new Error("The digital book could not be checked.");
  const data = value as Record<string, unknown>;
  if (data.availability === "locked" || data.availability === "unavailable") return { availability: data.availability };
  if (data.availability !== "ready" || typeof data.revision !== "string" || !/^[a-z0-9][a-z0-9-]{0,63}$/.test(data.revision)
    || !Array.isArray(data.pages) || !data.pages.length || data.pages.length > 300
    || !Number.isInteger(data.page_number) || (data.page_number as number) < 1 || (data.page_number as number) > data.pages.length) {
    throw new Error("The digital book is not ready to open.");
  }
  const prefix = `${bookId}/${data.revision}/`;
  const seen = new Set<string>();
  const pages = data.pages.map((page: unknown) => {
    if (!page || typeof page !== "object") throw new Error("Invalid book page.");
    const item = page as Record<string, unknown>;
    if (typeof item.path !== "string" || !item.path.startsWith(prefix)
      || !/^[a-zA-Z0-9_-]+\.(png|jpg|jpeg|webp)$/.test(item.path.slice(prefix.length))
      || seen.has(item.path) || typeof item.alt !== "string" || !item.alt.trim() || item.alt.trim().length > 10000) {
      throw new Error("Invalid book page.");
    }
    seen.add(item.path);
    return { path: item.path, alt: item.alt };
  });
  return { availability: "ready", revision: data.revision, pages, page_number: data.page_number as number };
}

export async function getDigitalBook(client: SupabaseClient<Database>, childId: string, bookId: string) {
  const { data, error } = await client.rpc("get_digital_book", { p_child_profile_id: childId, p_book_id: bookId });
  if (error) throw error;
  return parseDigitalBook(data, bookId);
}

export async function downloadDigitalPage(client: SupabaseClient<Database>, childId: string, bookId: string, book: ReadyDigitalBook, pageNumber: number) {
  if (!Number.isInteger(pageNumber) || pageNumber < 1 || pageNumber > book.pages.length) throw new Error("Choose a valid book page.");
  const current = await getDigitalBook(client, childId, bookId);
  if (current.availability !== "ready" || current.revision !== book.revision
    || current.pages[pageNumber - 1]?.path !== book.pages[pageNumber - 1].path) throw new Error("Reopen the book to check its availability.");
  const { data, error } = await client.storage.from("dc-digital-books").download(current.pages[pageNumber - 1].path);
  if (error) throw error;
  if (!data || data.size === 0 || data.size > 20971520 || !["image/png", "image/jpeg", "image/webp"].includes(data.type)) {
    throw new Error("This book page could not be opened.");
  }
  return data;
}

export async function saveDigitalBookPosition(client: SupabaseClient<Database>, childId: string, bookId: string, revision: string, pageNumber: number) {
  const { data, error } = await client.rpc("save_digital_book_position", {
    p_child_profile_id: childId, p_book_id: bookId, p_revision: revision, p_page_number: pageNumber
  });
  if (error) throw error;
  if (data !== pageNumber) throw new Error("Your reading place could not be confirmed.");
}
