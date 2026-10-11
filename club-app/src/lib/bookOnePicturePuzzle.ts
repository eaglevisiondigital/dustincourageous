

export type PicturePuzzleLevel = "explorer" | "adventurer" | "champion";

export const picturePuzzleLevels: Readonly<Record<PicturePuzzleLevel, {columns: number; rows: number; label: string}>> = {
  explorer: {columns: 3, rows: 2, label: "Explorer · 6 pieces"},
  adventurer: {columns: 4, rows: 3, label: "Adventurer · 12 pieces"},
  champion: {columns: 5, rows: 4, label: "Courage Champion · 20 pieces"}
};

export function newPicturePuzzle(size: number, random: () => number = Math.random): number[] {
  if (!Number.isInteger(size) || size < 2 || size > 100) throw new Error("Invalid puzzle size");
  const pieces = Array.from({length: size}, (_, index) => index);
  for (let index = size - 1; index > 0; index--) {
    const value = random();
    const chosen = Math.min(index, Math.max(0, Math.floor(value * (index + 1))));
    [pieces[index], pieces[chosen]] = [pieces[chosen], pieces[index]];
  }
  if (pieces.every((value, index) => value === index)) {
    pieces.push(pieces.shift()!);
  }
  return pieces;
}

export function swapPuzzlePieces(order: readonly number[], first: number, second: number): number[] {
  if (![first, second].every(x => Number.isInteger(x) && x >= 0 && x < order.length)) return [...order];
  const next = [...order];
  [next[first], next[second]] = [next[second], next[first]];
  return next;
}

export function isPicturePuzzleSolved(order: readonly number[]): boolean {
  return order.length > 0 && order.every((piece, index) => piece === index);
}

export function picturePiecePosition(piece: number, columns: number, rows: number) {
  if (!Number.isInteger(piece) || !Number.isInteger(columns) || !Number.isInteger(rows)
      || columns < 1 || rows < 1 || piece < 0 || piece >= columns * rows) return null;
  const col = piece % columns;
  const row = Math.floor(piece / columns);
  return {
    backgroundSize: `${columns * 100}% ${rows * 100}%`,
    backgroundPosition: `${columns === 1 ? 0 : (100 * col) / (columns - 1)}% ${rows === 1 ? 0 : (100 * row) / (rows - 1)}%`
  };
}
