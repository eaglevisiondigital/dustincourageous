export function readerKeyPage(key: string, page: number, total: number, blocked: boolean): number | null {
  if (blocked || !Number.isInteger(page) || !Number.isInteger(total) || page < 1 || page > total) return null;
  const target = key === "ArrowLeft" ? page - 1 : key === "ArrowRight" ? page + 1 : key === "Home" ? 1 : key === "End" ? total : null;
  return target !== null && target >= 1 && target <= total && target !== page ? target : null;
}

export function readerSwipePage(dx: number, dy: number, elapsed: number, page: number, total: number, blocked: boolean): number | null {
  if (blocked || ![dx, dy, elapsed].every(Number.isFinite) || elapsed < 0 || elapsed > 700
    || Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 2) return null;
  return readerKeyPage(dx < 0 ? "ArrowRight" : "ArrowLeft", page, total, false);
}
