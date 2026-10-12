import { useMemo, useState } from "react";
import {
  isScriptureScrambleSolved,
  nextScrambleHint,
  scrambleTiles,
  scriptureScrambleVerses,
  shuffleTileIndices,
  type ScriptureScrambleDifficulty
} from "../lib/scriptureScramble";

export function ScriptureScramble({ childName }: { childName: string }) {
  const [verseIndex, setVerseIndex] = useState(0);
  const [difficulty, setDifficulty] = useState<ScriptureScrambleDifficulty>("phrases");
  const [selected, setSelected] = useState<number[]>([]);
  const [bankOrder, setBankOrder] = useState<number[]>(() => shuffleTileIndices(scrambleTiles(scriptureScrambleVerses[0], "phrases").length));
  const [feedback, setFeedback] = useState("");
  const [hint, setHint] = useState("");
  const [showVerse, setShowVerse] = useState(false);
  const game = scriptureScrambleVerses[verseIndex];
  const tiles = useMemo(() => scrambleTiles(game, difficulty), [game, difficulty]);
  const solved = isScriptureScrambleSolved(selected, tiles, game.verse);
  const used = new Set(selected);

  function chooseGame(nextVerse: number, nextDifficulty: ScriptureScrambleDifficulty) {
    setVerseIndex(nextVerse);
    setDifficulty(nextDifficulty);
    setSelected([]);
    setBankOrder(shuffleTileIndices(scrambleTiles(scriptureScrambleVerses[nextVerse], nextDifficulty).length));
    setFeedback("");
    setHint("");
    setShowVerse(false);
  }
  function pick(index: number) {
    if (used.has(index) || solved) return;
    setSelected(previous => [...previous, index]);
    setFeedback("");
    setHint("");
  }
  function remove(index: number) {
    setSelected(previous => previous.filter((_, position) => position !== index));
    setFeedback("");
    setHint("");
  }
  function reset() {
    chooseGame(verseIndex, difficulty);
  }
  function check() {
    setHint("");
    if (selected.length !== tiles.length) {
      setFeedback("Keep going! Put every tile in your verse before checking.");
    } else if (solved) {
      setFeedback("You got it! God's Word belongs in your heart. Great work!");
    } else {
      setFeedback("Almost! Some tiles are out of order. Try moving them and check again.");
    }
  }

  return (
    <section className="dc-scripture-scramble" aria-labelledby="dc-scripture-scramble-title">
      <div className="dc-scramble-heading">
        <div>
          <p className="eyebrow red">Power Verse Challenge</p>
          <h2 id="dc-scripture-scramble-title">Scripture Scramble!</h2>
          <p>Hey, {childName}! Put God's Word in the right order. Tap a tile to move it into your verse.</p>
        </div>
        <img src="https://dustincourageous.com/assets/images/dc-shield.jpeg" alt="" loading="lazy" />
      </div>
      <div className="dc-scramble-settings">
        <label htmlFor="dc-scramble-verse">Choose Your Power Verse
          <select id="dc-scramble-verse" value={verseIndex} onChange={event => chooseGame(Number(event.target.value), difficulty)}>
            {scriptureScrambleVerses.map((verse, index) => (
              <option key={verse.id} value={index}>{verse.reference} · {verse.title}</option>
            ))}
          </select>
        </label>
        <label htmlFor="dc-scramble-mode">Mission Difficulty
          <select id="dc-scramble-mode" value={difficulty} onChange={event => chooseGame(verseIndex, event.target.value as ScriptureScrambleDifficulty)}>
            <option value="phrases">Easy: Longer Phrase Tiles</option>
            <option value="medium">Medium: 2–3 Words per Tile</option>
            <option value="words">Hard: Every Word Separate</option>
          </select>
        </label>
      </div>
      <p className="dc-scramble-reference"><strong>{game.reference}</strong> <span>{game.translation} • Practice Mode</span></p>
      <p className="dc-scramble-instruction">Your Verse • {selected.length} of {tiles.length} tiles placed</p>
      <div className="dc-scramble-answer" aria-label="Your arranged verse">
        {selected.length ? selected.map((index, position) => (
          <button key={index} type="button" className="dc-scramble-tile chosen" onClick={() => remove(position)}
            aria-label={`Remove ${tiles[index]} from position ${position + 1}`} title="Tap to remove this tile">
            {tiles[index]} <span aria-hidden="true">×</span>
          </button>
        )) : <p>Tap the scrambled tiles below to build your verse!</p>}
      </div>
      <p className="dc-scramble-instruction">Scrambled Tiles</p>
      <div className="dc-scramble-bank" aria-label="Available word or phrase tiles">
        {bankOrder.filter(index => !used.has(index)).map(index => (
          <button key={index} type="button" className="dc-scramble-tile" onClick={() => pick(index)}>{tiles[index]}</button>
        ))}
        {selected.length === tiles.length && <span className="dc-scramble-bank-empty">All tiles placed. Check your verse or tap a tile above to move it.</span>}
      </div>
      <div className="dc-scramble-actions">
        <button className="primary-button" type="button" onClick={check}>Check My Verse</button>
        <button className="secondary-button" type="button" onClick={() => { setHint(nextScrambleHint(selected, tiles)); setFeedback(""); }}>Give Me a Hint</button>
        <button className="secondary-button" type="button" onClick={reset}>Play Again</button>
        <button className="text-button" type="button" aria-expanded={showVerse} onClick={() => setShowVerse(value => !value)}>
          {showVerse ? "Hide the Verse" : "Read the Verse"}
        </button>
      </div>
      {showVerse && <p className="dc-scramble-full-verse"><strong>{game.reference} ({game.translation})</strong> {game.verse}</p>}
      <p className="dc-scramble-feedback" role="status" aria-live="polite">{feedback || hint}</p>
      <p className="dc-scramble-footnote">Practice game: this round does not grant XP or change your saved progress.</p>
    </section>
  );
}
