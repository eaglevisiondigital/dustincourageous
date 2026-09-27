import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { DigitalBookPreparation } from "./DigitalBookPreparation";

type Book = {
  id: string;
  book_number: number | null;
  title: string;
  status: string;
  release_date: string | null;
  completion_xp: number;
};

type LinkItem = {
  id: string;
  label: string;
};

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function BookAdmin() {
  const [books, setBooks] = useState<Book[]>([]);
  const [powerVerses, setPowerVerses] = useState<LinkItem[]>([]);
  const [devotionals, setDevotionals] = useState<LinkItem[]>([]);
  const [prayers, setPrayers] = useState<LinkItem[]>([]);
  const [identityTruths, setIdentityTruths] = useState<LinkItem[]>([]);
  const [challenges, setChallenges] = useState<LinkItem[]>([]);
  const [contentItems, setContentItems] = useState<LinkItem[]>([]);
  const [selectedBookId, setSelectedBookId] = useState("");
  const [linkType, setLinkType] = useState("power_verse");
  const [linkItemId, setLinkItemId] = useState("");
  const [message, setMessage] = useState("");
  const [working, setWorking] = useState(false);
  const [preparing, setPreparing] = useState(false);

  const [bookNumber, setBookNumber] = useState("2");
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [coverAssetKey, setCoverAssetKey] = useState("");
  const [releaseDate, setReleaseDate] = useState("");
  const [status, setStatus] = useState("draft");
  const [completionXp, setCompletionXp] = useState("150");

  const load = useCallback(async () => {
    const [bookResult,powerResult,devResult,prayerResult,identityResult,challengeResult,contentResult] = await Promise.all([
      supabase.from("books").select("id,book_number,title,status,release_date,completion_xp").order("book_number"),
      supabase.from("power_verses").select("id,title").order("created_at",{ascending:false}),
      supabase.from("devotional_series").select("id,title").order("created_at",{ascending:false}),
      supabase.from("prayer_prompts").select("id,title").order("created_at",{ascending:false}),
      supabase.from("identity_truths").select("id,title").order("sort_order"),
      supabase.from("challenges").select("id,title").order("created_at",{ascending:false}),
      supabase.from("content_items").select("id,title").order("created_at",{ascending:false})
    ]);

    const error = bookResult.error || powerResult.error || devResult.error || prayerResult.error || identityResult.error || challengeResult.error || contentResult.error;
    if (error) {
      setMessage(error.message);
      return;
    }

    const nextBooks=(bookResult.data??[]) as Book[];
    setBooks(nextBooks);
    setPowerVerses((powerResult.data??[]).map(x=>({id:x.id,label:x.title})));
    setDevotionals((devResult.data??[]).map(x=>({id:x.id,label:x.title})));
    setPrayers((prayerResult.data??[]).map(x=>({id:x.id,label:x.title})));
    setIdentityTruths((identityResult.data??[]).map(x=>({id:x.id,label:x.title})));
    setChallenges((challengeResult.data??[]).map(x=>({id:x.id,label:x.title})));
    setContentItems((contentResult.data??[]).map(x=>({id:x.id,label:x.title})));
    if(!selectedBookId && nextBooks[0]) setSelectedBookId(nextBooks[0].id);
  },[selectedBookId]);

  useEffect(()=>{ void load(); },[load]);

  const linkOptions = useMemo(() => {
    switch(linkType){
      case "power_verse": return powerVerses;
      case "devotional": return devotionals;
      case "prayer": return prayers;
      case "identity": return identityTruths;
      case "challenge": return challenges;
      case "content": return contentItems;
      default: return [];
    }
  },[linkType,powerVerses,devotionals,prayers,identityTruths,challenges,contentItems]);

  useEffect(()=>{
    if(linkOptions.length && !linkOptions.some(x=>x.id===linkItemId)) setLinkItemId(linkOptions[0].id);
  },[linkOptions,linkItemId]);

  async function createBook(event:FormEvent){
    event.preventDefault(); setWorking(true); setMessage("");
    const { data,error }=await supabase.rpc("admin_create_book",{
      p_book_number:Number(bookNumber),
      p_title:title,
      p_slug:slug || slugify(title),
      p_description:description || undefined,
      p_cover_asset_key:coverAssetKey || undefined,
      p_release_date:releaseDate || undefined,
      p_status:status,
      p_completion_xp:Number(completionXp)||0
    });
    setWorking(false);
    if(error) return setMessage(error.message);
    setTitle("");setSlug("");setDescription("");setCoverAssetKey("");setReleaseDate("");
    setBookNumber(String(Number(bookNumber)+1));
    setMessage("Book created.");
    await load();
    if(typeof data==="string") setSelectedBookId(data);
  }

  async function linkItem(event:FormEvent){
    event.preventDefault();
    if(!selectedBookId || !linkItemId) return;
    setWorking(true);setMessage("");
    const { error }=await supabase.rpc("admin_link_book_experience",{
      p_book_id:selectedBookId,
      p_item_type:linkType,
      p_item_id:linkItemId,
      p_sort_order:0
    });
    setWorking(false);
    if(error) return setMessage(error.message);
    setMessage("Companion item linked to book.");
  }

  return (
    <div className="admin-two-column">
      <section className="admin-card">
        <p className="eyebrow red">Publishing</p>
        <h2>Create Book</h2>
        <form className="admin-form" onSubmit={createBook}>
          <label>Book #<input required type="number" min="1" value={bookNumber} onChange={e=>setBookNumber(e.target.value)} /></label>
          <label>Completion XP<input type="number" min="0" value={completionXp} onChange={e=>setCompletionXp(e.target.value)} /></label>
          <label className="full">Title<input required value={title} onChange={e=>{setTitle(e.target.value);if(!slug)setSlug(slugify(e.target.value));}} /></label>
          <label className="full">Slug<input required value={slug} onChange={e=>setSlug(slugify(e.target.value))} /></label>
          <label className="full">Description<textarea value={description} onChange={e=>setDescription(e.target.value)} /></label>
          <label>Cover asset key<input value={coverAssetKey} onChange={e=>setCoverAssetKey(e.target.value)} placeholder="book2-front.jpeg" /></label>
          <label>Release date<input type="date" value={releaseDate} onChange={e=>setReleaseDate(e.target.value)} /></label>
          <label>Status<select value={status} onChange={e=>setStatus(e.target.value)}><option value="draft">Draft</option><option value="coming_soon">Coming Soon</option><option value="published" disabled>Publish through DC Governance</option></select></label>
          <button className="primary-button full" disabled={working}>Create Book</button>
        </form>
      </section>

      <section className="admin-card">
        <p className="eyebrow gold">Interactive Companion</p>
        <h2>Link Book Experience</h2>
        {message && <div className="form-message">{message}</div>}
        <form className="admin-form" onSubmit={linkItem}>
          <label className="full">Book<select required disabled={preparing} value={selectedBookId} onChange={e=>setSelectedBookId(e.target.value)}><option value="">Select book</option>{books.map(book=><option key={book.id} value={book.id}>#{book.book_number} · {book.title}</option>)}</select></label>
          <label>Item type<select value={linkType} onChange={e=>setLinkType(e.target.value)}><option value="power_verse">Power Verse</option><option value="devotional">Devotional</option><option value="prayer">Prayer</option><option value="identity">Identity Truth</option><option value="challenge">Challenge</option><option value="content">Video / Download / Content</option></select></label>
          <label>Companion item<select required value={linkItemId} onChange={e=>setLinkItemId(e.target.value)}>{linkOptions.map(item=><option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
          <button className="secondary-button full" disabled={working || !linkItemId}>Link to Book</button>
        </form>
        <div className="admin-list" style={{marginTop:20}}>
          {books.map(book=>(
            <article className="admin-list-row" key={book.id}>
              <div><strong>#{book.book_number} · {book.title}</strong><small>{book.release_date || "No release date"} · {book.completion_xp} completion XP</small></div>
              <span className={book.status==="published"?"status-chip done":"status-chip"}>{book.status.replaceAll("_"," ")}</span>
            </article>
          ))}
        </div>
      </section>
      {selectedBookId && <DigitalBookPreparation key={selectedBookId} bookId={selectedBookId}
        title={books.find(book => book.id === selectedBookId)?.title ?? "digital book"} onPrepared={load} onBusyChange={setPreparing} />}
    </div>
  );
}
