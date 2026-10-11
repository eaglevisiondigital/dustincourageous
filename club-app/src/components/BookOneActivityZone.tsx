import { useState } from "react";
import {
  isPicturePuzzleSolved, newPicturePuzzle, picturePiecePosition,
  picturePuzzleLevels, swapPuzzlePieces, type PicturePuzzleLevel
} from "../lib/bookOnePicturePuzzle";

type Zone = "missions" | "puzzles" | "coloring";

const missions = [
  {
    id: "new-friend", tag: "MISSION 01", icon: "🤝", title: "Make a New Friend",
    instruction: "Smile, introduce yourself, and show kindness to someone new.",
    sayIt: "The love of God helps me show kindness.",
    tip: "Start with a hello. You can ask your parent or guardian to help you practice."
  },
  {
    id: "raise-hand", tag: "MISSION 02", icon: "✋", title: "Raise Your Hand",
    instruction: "When you know an answer in class, be courageous and participate.",
    sayIt: "God has given me power, love, and a sound mind.",
    tip: "It's okay to try, even when you are still learning."
  },
  {
    id: "pray-aloud", tag: "MISSION 03", icon: "🙏", title: "Pray Out Loud",
    instruction: "Talk to God out loud with simple words and confidence.",
    sayIt: "I can talk to my Father God.",
    tip: "Begin with 'Dear God,' and speak from your heart."
  },
  {
    id: "invite-friend", tag: "MISSION 04", icon: "⛪", title: "Invite a Friend",
    instruction: "With your family's help, invite a friend to church.",
    sayIt: "I can share God's love with other people.",
    tip: "Ask your parent or guardian before inviting someone."
  }
] as const;

const printables = [
  {id:"01",name:"When I Am Afraid, I Choose Faith!",theme:"Faith over fear",url:"01_When_I_Am_Afraid_I_Choose_Faith.pdf",icon:"🙏"},
  {id:"02",name:"No Fear Here! Climbing Wall",theme:"Stand strong in God's Word",url:"02_No_Fear_Here_Climbing_Wall.pdf",icon:"🧗"},
  {id:"03",name:"We Always Win in Christ!",theme:"Victory in Christ",url:"03_We_Always_Win_In_Christ.pdf",icon:"🏆"},
  {id:"04",name:"God Is in Me!",theme:"1 John 4:4",url:"04_God_Is_In_Me.pdf",icon:"🛡️"}
] as const;

export function BookOneActivityZone({childName,relationship,zone}:{
  childName: string; relationship?: unknown; zone: Zone;
}) {
  return <div className="dc-book-one-zone">
    {zone === "missions" && <CourageMissions relationship={relationship}/>}
    {zone === "puzzles" && <BookOnePicturePuzzle childName={childName}/>}
    {zone === "coloring" && <BookOneColoring relationship={relationship}/>}
  </div>;
}

function CourageMissions({relationship}:{relationship?:unknown}) {
  const [active,setActive]=useState<(typeof missions)[number]["id"] | null>(null);
  const role=relationship === "parent" ? "parent" : "guardian";
  return <section className="dc-courage-missions" aria-labelledby="dc-courage-missions-title">
    <header className="dc-mission-head">
      <div>
        <p className="eyebrow red">Dustin's Challenge • Book #1</p>
        <h2 id="dc-courage-missions-title">MY COURAGE MISSIONS!</h2>
        <p><strong>Choose ONE brave thing to do this week.</strong> The Greater One lives in those who belong to Jesus. His power and love help us live courageously.</p>
      </div>
      <img src="/assets/images/dc-shield.jpeg" alt="Official Dustin Courageous shield" loading="lazy"/>
    </header>
    <div className="dc-mission-grid">
      {missions.map((mission) => (
        <article key={mission.id} className={active===mission.id?"dc-mission-card open":"dc-mission-card"}>
          <div className="dc-mission-top"><span>{mission.tag}</span><span aria-hidden="true">{mission.icon}</span></div>
          <h3>{mission.title}</h3>
          <p>{mission.instruction}</p>
          <button type="button" className="dc-mission-open" aria-expanded={active===mission.id}
            onClick={() => setActive(current => current===mission.id?null:mission.id)}>
            {active===mission.id?"Close Mission":"Explore Mission"}
          </button>
          {active===mission.id && <div className="dc-mission-detail">
            <p><strong>SAY IT:</strong> {mission.sayIt}</p>
            <p><strong>YOUR MISSION:</strong> {mission.tip.replaceAll("parent or guardian",role)}</p>
            <p>Tell your {role} about your mission when you're finished.</p>
          </div>}
        </article>
      ))}
    </div>
    <p className="dc-zone-disclaimer">These are Book 1 practice missions. Parent-approved completion tracking and XP will be added through Adventure Club's existing protected approval system. Nothing you choose here is submitted or recorded.</p>
  </section>;
}

function BookOnePicturePuzzle({childName}:{childName:string}) {
  const [level,setLevel]=useState<PicturePuzzleLevel>("explorer");
  const [pieces,setPieces]=useState<number[]>(() => newPicturePuzzle(6));
  const [selected,setSelected]=useState<number | null>(null);
  const [showPicture,setShowPicture]=useState(false);
  const setting=picturePuzzleLevels[level];
  const solved=isPicturePuzzleSolved(pieces);
  function reset(nextLevel:PicturePuzzleLevel=level) {
    const next=picturePuzzleLevels[nextLevel];
    setLevel(nextLevel);
    setPieces(newPicturePuzzle(next.columns*next.rows));
    setSelected(null);
    setShowPicture(false);
  }
  function pick(position:number) {
    if(solved) return;
    if(selected===null){setSelected(position);return;}
    if(selected===position){setSelected(null);return;}
    setPieces(current=>swapPuzzlePieces(current,selected,position));
    setSelected(null);
  }
  return <section className="dc-picture-puzzle" aria-labelledby="dc-picture-puzzle-title">
    <header className="dc-puzzle-head">
      <div>
        <p className="eyebrow gold">Book #1 • Picture Puzzle</p>
        <h2 id="dc-picture-puzzle-title">PUT THE ADVENTURE TOGETHER!</h2>
        <p>Hey, {childName}! Restore Dustin's scene from the Book 1 preview. Tap a piece, then tap where you'd like to swap it.</p>
      </div>
      <img src="/assets/images/book1-front.jpeg" alt="Dustin Courageous and the No-Fear Secret book cover" loading="lazy" />
    </header>
    <div className="dc-puzzle-toolbar">
      <label>Choose Your Challenge
        <select value={level} onChange={event=>reset(event.target.value as PicturePuzzleLevel)}>
          {Object.entries(picturePuzzleLevels).map(([key,value])=><option value={key} key={key}>{value.label}</option>)}
        </select>
      </label>
      <button type="button" className="secondary-button" onClick={() => setShowPicture(value=>!value)} aria-expanded={showPicture}>
        {showPicture?"Hide Picture":"Show Picture"}
      </button>
      <button type="button" className="secondary-button" onClick={()=>reset()}>Shuffle Again</button>
    </div>
    {showPicture && <img className="dc-puzzle-reference" src="/assets/images/book1-preview-wall-pages17-18.webp" alt="Preview of the finished Book 1 scene" />}
    <div className="dc-puzzle-board" style={{gridTemplateColumns:`repeat(${setting.columns},minmax(0,1fr))`,aspectRatio:"16/9"}}
      role="group" aria-label="Picture puzzle; tap two positions to swap">
      {pieces.map((piece,position)=>{
        const where=picturePiecePosition(piece,setting.columns,setting.rows);
        return <button key={position} type="button" className={selected===position?"dc-puzzle-piece selected":"dc-puzzle-piece"}
          style={{...where,backgroundImage:"url('/assets/images/book1-preview-wall-pages17-18.webp')"}}
          onClick={()=>pick(position)} aria-pressed={selected===position}
          aria-label={`Position ${position+1}, piece ${piece+1}; ${selected===position?"selected":"tap to select or swap"}`}/>;
      })}
    </div>
    <div className="dc-puzzle-foot">
      <p role="status" aria-live="polite">{solved?"You did it! Picture Puzzle complete! You can shuffle and play again.":selected===null?"Choose any two pieces to trade places.":"Now tap another piece to swap their positions."}</p>
      <small>This is a practice puzzle using publicly released Book 1 preview artwork. It does not award XP or reveal the protected full digital book.</small>
    </div>
  </section>;
}

function BookOneColoring({relationship}:{relationship?:unknown}) {
  const role=relationship==="parent"?"parent":"guardian";
  const prefix="/printables/book1/";
  return <section className="dc-coloring-zone" aria-labelledby="dc-coloring-title">
    <header className="dc-coloring-head">
      <div>
        <p className="eyebrow red">Coloring Headquarters • Book #1</p>
        <h2 id="dc-coloring-title">COLOR YOUR COURAGE!</h2>
        <p>Choose a Dustin Courageous coloring page. Your {role} can open the printable PDF and select Print in their browser.</p>
      </div>
      <img src="/assets/images/dc-shield.jpeg" alt="Official DC shield" loading="lazy"/>
    </header>
    <div className="dc-coloring-grid">
      {printables.map((page,i)=><article className="dc-coloring-card" key={page.id}>
        <div className="dc-coloring-illustration"><span aria-hidden="true">{page.icon}</span><strong>PAGE {i+1}</strong></div>
        <h3>{page.name}</h3>
        <p>{page.theme}</p>
        <a className="secondary-button" href={prefix+page.url} target="_blank" rel="noopener noreferrer">Open Printable PDF</a>
      </article>)}
    </div>
    <a className="primary-button dc-coloring-full-pack" href={prefix+"Dustin_Courageous_Book_1_Coloring_Sheets_Complete_Set.pdf"}
      target="_blank" rel="noopener noreferrer">Open All 4 Coloring Pages</a>
    <p className="dc-zone-disclaimer">These are the original, approved Book 1 printable files. Digital tap-to-color and artwork saving will be added separately. Printing is not required to enjoy other Adventure Club activities.</p>
  </section>;
}
