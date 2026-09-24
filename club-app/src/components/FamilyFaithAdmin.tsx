import { FormEvent, useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Book = {
  id: string;
  title: string;
  book_number: number | null;
};

type Scripture = {
  id: string;
  reference: string;
  translation: string;
};

type Reward = {
  id: string;
  name: string;
  reward_type: string;
};

type GuideRow = {
  id: string;
  title: string;
  guide_key: string;
  status: string;
  access_level: string;
  books: { title: string; book_number: number | null } | { title: string; book_number: number | null }[] | null;
};

type RuleRow = {
  id: string;
  milestone: string;
  is_active: boolean;
  books: { title: string; book_number: number | null } | { title: string; book_number: number | null }[] | null;
  rewards: { name: string; reward_type: string } | { name: string; reward_type: string }[] | null;
};

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
}

function firstRelation<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

export function FamilyFaithAdmin() {
  const [books,setBooks]=useState<Book[]>([]);
  const [scriptures,setScriptures]=useState<Scripture[]>([]);
  const [rewards,setRewards]=useState<Reward[]>([]);
  const [guides,setGuides]=useState<GuideRow[]>([]);
  const [rules,setRules]=useState<RuleRow[]>([]);
  const [message,setMessage]=useState("");
  const [working,setWorking]=useState(false);

  const [guideTitle,setGuideTitle]=useState("");
  const [guideKey,setGuideKey]=useState("");
  const [guideBookId,setGuideBookId]=useState("");
  const [guideDescription,setGuideDescription]=useState("");
  const [scriptureId,setScriptureId]=useState("");
  const [discussion,setDiscussion]=useState("");
  const [prayer,setPrayer]=useState("");
  const [familyAction,setFamilyAction]=useState("");
  const [guideStatus,setGuideStatus]=useState("draft");
  const [guideAccess,setGuideAccess]=useState("free");

  const [rewardBookId,setRewardBookId]=useState("");
  const [rewardId,setRewardId]=useState("");
  const [milestone,setMilestone]=useState("adventure_completed");

  const load=useCallback(async()=>{
    setMessage("");
    const [bookResult,scriptureResult,rewardResult,guideResult,ruleResult]=await Promise.all([
      supabase.from("books").select("id,title,book_number").order("book_number",{ascending:true}),
      supabase.from("scripture_passages").select("id,reference,translation").eq("status","published").order("reference"),
      supabase.from("rewards").select("id,name,reward_type").eq("is_active",true).order("name"),
      supabase.from("family_faith_guides").select("id,title,guide_key,status,access_level,books(title,book_number)").order("created_at",{ascending:false}),
      supabase.from("book_reward_rules").select("id,milestone,is_active,books(title,book_number),rewards(name,reward_type)").order("created_at",{ascending:false})
    ]);

    const error=bookResult.error||scriptureResult.error||rewardResult.error||guideResult.error||ruleResult.error;
    if(error){
      setMessage(error.message);
      return;
    }

    const nextBooks=(bookResult.data??[]) as Book[];
    const nextScriptures=(scriptureResult.data??[]) as Scripture[];
    const nextRewards=(rewardResult.data??[]) as Reward[];

    setBooks(nextBooks);
    setScriptures(nextScriptures);
    setRewards(nextRewards);
    setGuides((guideResult.data??[]) as GuideRow[]);
    setRules((ruleResult.data??[]) as RuleRow[]);

    if(!guideBookId && nextBooks[0]) setGuideBookId(nextBooks[0].id);
    if(!rewardBookId && nextBooks[0]) setRewardBookId(nextBooks[0].id);
    if(!scriptureId && nextScriptures[0]) setScriptureId(nextScriptures[0].id);
    if(!rewardId && nextRewards[0]) setRewardId(nextRewards[0].id);
  },[guideBookId,rewardBookId,scriptureId,rewardId]);

  useEffect(()=>{void load();},[load]);

  async function createGuide(event:FormEvent){
    event.preventDefault();
    setWorking(true);
    setMessage("");

    const {error}=await supabase.rpc("admin_create_family_faith_guide",{
      p_guide_key:guideKey||slugify(guideTitle),
      p_title:guideTitle.trim(),
      p_book_id:guideBookId||undefined,
      p_description:guideDescription.trim()||undefined,
      p_scripture_passage_id:scriptureId||undefined,
      p_discussion_prompt:discussion.trim()||undefined,
      p_prayer_prompt:prayer.trim()||undefined,
      p_family_action:familyAction.trim()||undefined,
      p_access_level:guideAccess,
      p_status:guideStatus,
      p_sort_order:0
    });

    setWorking(false);

    if(error){
      setMessage(error.message);
      return;
    }

    setGuideTitle("");
    setGuideKey("");
    setGuideDescription("");
    setDiscussion("");
    setPrayer("");
    setFamilyAction("");
    setMessage("Family Faith guide created.");
    await load();
  }

  async function linkReward(event:FormEvent){
    event.preventDefault();
    if(!rewardBookId||!rewardId) return;

    setWorking(true);
    setMessage("");

    const {error}=await supabase.rpc("admin_link_book_reward",{
      p_book_id:rewardBookId,
      p_reward_id:rewardId,
      p_milestone:milestone
    });

    setWorking(false);

    if(error){
      setMessage(error.message);
      return;
    }

    setMessage("Book completion reward linked.");
    await load();
  }

  return (
    <div className="family-faith-admin">
      {message&&<div className="form-message">{message}</div>}

      <div className="admin-two-column">
        <section className="admin-card">
          <p className="eyebrow gold">Faith at Home</p>
          <h2>Create family guide</h2>

          <form className="admin-form" onSubmit={createGuide}>
            <label>
              Guide title
              <input
                required
                value={guideTitle}
                onChange={(event)=>{
                  setGuideTitle(event.target.value);
                  if(!guideKey) setGuideKey(slugify(event.target.value));
                }}
              />
            </label>

            <label>
              Guide key
              <input required value={guideKey} onChange={(event)=>setGuideKey(slugify(event.target.value))}/>
            </label>

            <label>
              Book
              <select value={guideBookId} onChange={(event)=>setGuideBookId(event.target.value)}>
                <option value="">No specific book</option>
                {books.map((book)=><option key={book.id} value={book.id}>Book #{book.book_number??""} · {book.title}</option>)}
              </select>
            </label>

            <label>
              Scripture
              <select value={scriptureId} onChange={(event)=>setScriptureId(event.target.value)}>
                <option value="">No Scripture link</option>
                {scriptures.map((item)=><option key={item.id} value={item.id}>{item.reference} · {item.translation}</option>)}
              </select>
            </label>

            <label className="full">
              Description
              <textarea value={guideDescription} onChange={(event)=>setGuideDescription(event.target.value)}/>
            </label>

            <label className="full">
              Talk About It
              <textarea value={discussion} onChange={(event)=>setDiscussion(event.target.value)}/>
            </label>

            <label className="full">
              Pray Together
              <textarea value={prayer} onChange={(event)=>setPrayer(event.target.value)}/>
            </label>

            <label className="full">
              Do It Together
              <textarea value={familyAction} onChange={(event)=>setFamilyAction(event.target.value)}/>
            </label>

            <label>
              Access
              <select value={guideAccess} onChange={(event)=>setGuideAccess(event.target.value)}>
                <option value="free">Free</option>
                <option value="member">Member</option>
                <option value="premium">Premium</option>
              </select>
            </label>

            <label>
              Status
              <select value={guideStatus} onChange={(event)=>setGuideStatus(event.target.value)}>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </label>

            <button className="primary-button full" disabled={working}>
              Create Family Faith guide
            </button>
          </form>
        </section>

        <section className="admin-card">
          <p className="eyebrow red">Book Milestone</p>
          <h2>Link completion reward</h2>

          <form className="admin-form" onSubmit={linkReward}>
            <label className="full">
              Book
              <select value={rewardBookId} onChange={(event)=>setRewardBookId(event.target.value)}>
                {books.map((book)=><option key={book.id} value={book.id}>Book #{book.book_number??""} · {book.title}</option>)}
              </select>
            </label>

            <label className="full">
              Reward
              <select value={rewardId} onChange={(event)=>setRewardId(event.target.value)}>
                {rewards.map((reward)=><option key={reward.id} value={reward.id}>{reward.name} · {reward.reward_type}</option>)}
              </select>
            </label>

            <label className="full">
              Unlock milestone
              <select value={milestone} onChange={(event)=>setMilestone(event.target.value)}>
                <option value="book_completed">Book completed</option>
                <option value="adventure_completed">Full Book Adventure completed</option>
              </select>
            </label>

            <button className="secondary-button full" disabled={working}>
              Link reward
            </button>
          </form>

          <p className="privacy-note">
            Create rewards in the Rewards section first, then connect them here to a book milestone.
          </p>
        </section>
      </div>

      <div className="admin-two-column">
        <section className="admin-card">
          <div className="section-heading compact-heading">
            <div><p className="eyebrow gold">Published + Draft</p><h2>Family guides</h2></div>
            <span className="pill">{guides.length}</span>
          </div>
          <div className="admin-list">
            {guides.map((guide)=>{
              const book=firstRelation(guide.books);
              return (
                <article className="admin-list-row" key={guide.id}>
                  <div>
                    <strong>{guide.title}</strong>
                    <small>{book ? "Book #"+(book.book_number??"")+" · "+book.title : "General family guide"} · {guide.access_level}</small>
                  </div>
                  <span className={guide.status==="published"?"status-chip done":"status-chip"}>{guide.status}</span>
                </article>
              );
            })}
            {!guides.length&&<p className="muted">No family guides yet.</p>}
          </div>
        </section>

        <section className="admin-card">
          <div className="section-heading compact-heading">
            <div><p className="eyebrow red">Automation</p><h2>Book reward rules</h2></div>
            <span className="pill">{rules.length}</span>
          </div>
          <div className="admin-list">
            {rules.map((rule)=>{
              const book=firstRelation(rule.books);
              const reward=firstRelation(rule.rewards);
              return (
                <article className="admin-list-row" key={rule.id}>
                  <div>
                    <strong>{reward?.name||"Reward"}</strong>
                    <small>{book?.title||"Book"} · {rule.milestone.replaceAll("_"," ")}</small>
                  </div>
                  <span className={rule.is_active?"status-chip done":"status-chip"}>{rule.is_active?"active":"inactive"}</span>
                </article>
              );
            })}
            {!rules.length&&<p className="muted">No book reward rules yet.</p>}
          </div>
        </section>
      </div>
    </div>
  );
}
