export type ScriptureScrambleDifficulty = "phrases" | "medium" | "words";

export type ScriptureScrambleVerse = {
  id: "timothy" | "john";
  reference: string;
  translation: "KJV";
  title: string;
  verse: string;
  phrases: readonly string[];
};

export const scriptureScrambleVerses: readonly ScriptureScrambleVerse[] = [
  {
    id: "timothy",
    reference: "2 Timothy 1:7",
    translation: "KJV",
    title: "God Gave Me Power, Love, and a Sound Mind",
    verse: "For God hath not given us the spirit of fear; but of power, and of love, and of a sound mind.",
    phrases: ["For God hath not given us", "the spirit of fear;", "but of power,", "and of love,", "and of a sound mind."]
  },
  {
    id: "john",
    reference: "1 John 4:4",
    translation: "KJV",
    title: "Greater Is He That Is in You",
    verse: "Ye are of God, little children, and have overcome them: because greater is he that is in you, than he that is in the world.",
    phrases: ["Ye are of God, little children,", "and have overcome them:", "because greater is he that is in you,", "than he that is in the world."]
  }
] as const;

export function scrambleTiles(verse: ScriptureScrambleVerse, difficulty: ScriptureScrambleDifficulty): string[] {
  if (difficulty === "phrases") return [...verse.phrases];
  const words = verse.verse.split(/\s+/).filter(Boolean);
  if (difficulty === "words") return words;
  const groups: string[] = [];
  for (let index = 0; index < words.length; index += 3) {
    groups.push(words.slice(index, index + 3).join(" "));
  }
  return groups;
}

export function shuffleTileIndices(length: number, random: () => number = Math.random): number[] {
  const indices = Array.from({length}, (_, index) => index);
  for (let index = length - 1; index > 0; index--) {
    const value = random();
    const pick = Math.min(index, Math.max(0, Math.floor(value * (index + 1))));
    [indices[index], indices[pick]] = [indices[pick], indices[index]];
  }
  if (length > 1 && indices.every((value, index) => value === index)) {
    indices.push(indices.shift()!);
  }
  return indices;
}

export function isScriptureScrambleSolved(
  selected: readonly number[],
  tiles: readonly string[],
  target: string
): boolean {
  if (selected.length !== tiles.length || new Set(selected).size !== tiles.length) return false;
  if (selected.some(index => !Number.isInteger(index) || index < 0 || index >= tiles.length)) return false;
  const normalize = (value: string) => value.replace(/\s+/g, " ").trim();
  return normalize(selected.map(index => tiles[index]).join(" ")) === normalize(target);
}

export function nextScrambleHint(selected: readonly number[], tiles: readonly string[]): string {
  for (let index = 0; index < selected.length; index++) {
    if (tiles[selected[index]] !== tiles[index]) return "Check the order of the tiles you already placed.";
  }
  return selected.length < tiles.length ? `The next tile is: "${tiles[selected.length]}"` : "Check the order of your answer.";
}
