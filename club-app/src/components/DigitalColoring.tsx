import { useEffect, useRef, useState } from "react";
import { paintBucketFill, parseColorHex } from "../lib/digitalColoring";

const colors = [
  ["Red", "#E13239"], ["Orange", "#FF8B35"], ["Yellow", "#FFDF51"],
  ["Grass Green", "#55B64D"], ["Sky Blue", "#64C8F3"], ["Royal Blue", "#2467D5"],
  ["Purple", "#A36AE2"], ["Pink", "#F2A9CA"], ["Brown", "#A36C43"],
  ["Tan", "#F2C693"], ["Silver", "#C7C7D1"], ["White", "#FFFFFF"]
] as const;

const sources = [
  "/activities/book1/digital-coloring-01.png",
  "/activities/book1/digital-coloring-02.png",
  "/activities/book1/digital-coloring-03.png",
  "/activities/book1/digital-coloring-04.png"
] as const;

export function DigitalColoring({ pageIndex, pageTitle, onClose }: {
  pageIndex: number; pageTitle: string; onClose: () => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const original = useRef<ImageData | null>(null);
  const history = useRef<ImageData[]>([]);
  const [ready, setReady] = useState(false);
  const [undoCount, setUndoCount] = useState(0);
  const [color, setColor] = useState<string>("#E13239");
  const [status, setStatus] = useState("Loading your coloring page...");
  const [cursor, setCursor] = useState({x: 40, y: 40});
  const [keyboardFocus, setKeyboardFocus] = useState(false);
  const [dimensions, setDimensions] = useState({width: 1, height: 1});

  useEffect(() => {
    let cancelled = false;
    const img = new Image();
    setReady(false);
    setStatus("Loading your coloring page...");
    history.current = [];
    setUndoCount(0);
    img.onload = () => {
      if (cancelled || !canvas.current) return;
      const target = canvas.current;
      target.width = img.naturalWidth;
      target.height = img.naturalHeight;
      const ctx = target.getContext("2d", { willReadFrequently: true });
      if (!ctx) {setStatus("Digital coloring is not supported by this browser."); return;}
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, 0, 0);
      original.current = ctx.getImageData(0, 0, target.width, target.height);
      setDimensions({width: target.width, height: target.height});
      setCursor({x: Math.floor(target.width / 2), y: Math.floor(target.height / 2)});
      setReady(true);
      setStatus("Choose a color, then tap an open space in the picture.");
    };
    img.onerror = () => { if (!cancelled) setStatus("This coloring page couldn't open. Try another page."); };
    img.src = sources[pageIndex] ?? sources[0];
    return () => { cancelled = true; img.onload = null; img.onerror = null; };
  }, [pageIndex]);

  function pushUndo(snapshot: ImageData) {
    history.current = [...history.current.slice(-3), snapshot];
    setUndoCount(history.current.length);
  }
  function colorAt(x: number, y: number) {
    if (!ready || !canvas.current) return;
    const ctx = canvas.current.getContext("2d", { willReadFrequently: true });
    const rgb = parseColorHex(color);
    if (!ctx || !rgb) return;
    const width = canvas.current.width, height = canvas.current.height;
    const before = ctx.getImageData(0, 0, width, height);
    const pixels = new Uint8ClampedArray(before.data);
    const filled = paintBucketFill(pixels, width, height, x, y, rgb);
    if (!filled) { setStatus("Try tapping inside a white or colored area, not on a black line."); return; }
    pushUndo(before);
    const next = ctx.createImageData(width, height);
    next.data.set(pixels);
    ctx.putImageData(next, 0, 0);
    setStatus("Great coloring! Choose another area or try a new color.");
  }
  function reset() {
    if (!ready || !canvas.current || !original.current) return;
    const ctx = canvas.current.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    pushUndo(ctx.getImageData(0, 0, canvas.current.width, canvas.current.height));
    ctx.putImageData(original.current, 0, 0);
    setStatus("Page reset! Pick a color and start again.");
  }
  function undo() {
    if (!canvas.current || !history.current.length) return;
    const ctx = canvas.current.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    const prev = history.current.pop();
    if (prev) ctx.putImageData(prev, 0, 0);
    setUndoCount(history.current.length);
    setStatus("Last change undone.");
  }
  function saveArtwork() {
    if (!ready || !canvas.current) return;
    canvas.current.toBlob(blob => {
      if (!blob) {setStatus("Unable to save. Please try again."); return;}
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `DC-Book1-Coloring-Page-${pageIndex + 1}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 3000);
      setStatus("Artwork saved to this device. No picture was uploaded.");
    }, "image/png");
  }
  function moveCursor(dx: number, dy: number) {
    setCursor(point => ({
      x: Math.max(0, Math.min(dimensions.width - 1, point.x + dx)),
      y: Math.max(0, Math.min(dimensions.height - 1, point.y + dy))
    }));
  }
  return <section id="dc-digital-coloring" className="dc-digital-coloring" aria-labelledby="dc-coloring-game-title">
    <div className="dc-coloring-game-head">
      <div>
        <p className="eyebrow red">Creative Adventure • Book #1</p>
        <h3 id="dc-coloring-game-title">Color It Digitally!</h3>
        <p>{pageTitle} · Choose a color, then tap a space to fill it. The original printable remains unchanged.</p>
      </div>
      <button className="secondary-button" type="button" onClick={onClose}>Close Coloring</button>
    </div>
    <div className="dc-coloring-palette" role="group" aria-label="Choose a coloring paint">
      {colors.map(([label, value]) => (
        <button key={value} className={value === color ? "dc-color-swatch selected" : "dc-color-swatch"}
          type="button" style={{backgroundColor:value}} onClick={() => setColor(value)}
          aria-label={`Choose ${label}`} aria-pressed={color === value} title={label}>
          {color === value && <span aria-hidden="true">✓</span>}
        </button>
      ))}
    </div>
    <div className="dc-coloring-tools">
      <span>Selected color: <strong>{colors.find(([,value]) => value === color)?.[0]}</strong></span>
      <button className="secondary-button" type="button" onClick={undo} disabled={!ready || !undoCount}>Undo</button>
      <button className="secondary-button" type="button" onClick={reset} disabled={!ready}>Reset Page</button>
      <button className="primary-button" type="button" onClick={saveArtwork} disabled={!ready}>Save to This Device</button>
    </div>
    <div className="dc-coloring-canvas-wrap">
      <canvas ref={canvas} className="dc-coloring-canvas" tabIndex={0}
        role="img" aria-label={`Digital coloring picture: ${pageTitle}. Use touch or mouse to fill spaces. Keyboard: arrow keys move the cursor, Enter or Space fills a region.`}
        onFocus={() => setKeyboardFocus(true)} onBlur={() => setKeyboardFocus(false)}
        onPointerDown={event => {
          if (!ready) return;
          event.preventDefault();
          const rect = event.currentTarget.getBoundingClientRect();
          const x = Math.max(0,Math.min(dimensions.width-1,Math.floor((event.clientX - rect.left) / rect.width * dimensions.width)));
          const y = Math.max(0,Math.min(dimensions.height-1,Math.floor((event.clientY - rect.top) / rect.height * dimensions.height)));
          setCursor({x,y});
          colorAt(x,y);
        }}
        onKeyDown={event => {
          const movements: Record<string,[number,number]> = {
            ArrowLeft:[-32,0],ArrowRight:[32,0],ArrowUp:[0,-32],ArrowDown:[0,32]
          };
          if (movements[event.key]) {
            event.preventDefault();
            moveCursor(...movements[event.key]);
          } else if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            colorAt(cursor.x, cursor.y);
          }
        }}/>
      {keyboardFocus && ready && <span className="dc-coloring-cursor" aria-hidden="true"
        style={{left:`${cursor.x / dimensions.width * 100}%`,top:`${cursor.y / dimensions.height * 100}%`}} />}
    </div>
    <p className="dc-coloring-status" role="status">{status}</p>
    <p className="dc-coloring-help">Practice mode. Your colors stay on this screen unless you save a PNG to your device. They are not uploaded, shared, or awarded XP. Parents and guardians can still print the unchanged original PDF.</p>
  </section>;
}
