import { FormEvent, useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Scripture = {
  id: string;
  reference: string;
  translation: string;
  verse_text: string;
  theme_key: string | null;
  status: string;
};

type DevotionalSeries = {
  id: string;
  title: string;
  status: string;
};

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function FaithContentAdmin() {
  const [tab, setTab] = useState<"scripture"|"power"|"devotional"|"prayer"|"identity">("scripture");
  const [scriptures, setScriptures] = useState<Scripture[]>([]);
  const [series, setSeries] = useState<DevotionalSeries[]>([]);
  const [message, setMessage] = useState("");
  const [working, setWorking] = useState(false);

  const [reference, setReference] = useState("");
  const [translation, setTranslation] = useState("KJV");
  const [verseText, setVerseText] = useState("");
  const [theme, setTheme] = useState("");

  const [powerTitle, setPowerTitle] = useState("");
  const [powerSlug, setPowerSlug] = useState("");
  const [powerScriptureId, setPowerScriptureId] = useState("");
  const [powerExplanation, setPowerExplanation] = useState("");
  const [sayIt, setSayIt] = useState("");
  const [liveIt, setLiveIt] = useState("");
  const [giveItAway, setGiveItAway] = useState("");
  const [memorizeXp, setMemorizeXp] = useState("50");
  const [powerStatus, setPowerStatus] = useState("draft");
  const [powerFeatured, setPowerFeatured] = useState(false);

  const [seriesTitle, setSeriesTitle] = useState("");
  const [seriesSlug, setSeriesSlug] = useState("");
  const [seriesDescription, setSeriesDescription] = useState("");
  const [seriesStatus, setSeriesStatus] = useState("draft");
  const [selectedSeriesId, setSelectedSeriesId] = useState("");
  const [dayNumber, setDayNumber] = useState("1");
  const [dayTitle, setDayTitle] = useState("");
  const [dayBody, setDayBody] = useState("");
  const [dayScriptureId, setDayScriptureId] = useState("");
  const [dayPrayer, setDayPrayer] = useState("");
  const [dayAction, setDayAction] = useState("");
  const [dayXp, setDayXp] = useState("25");

  const [prayerTitle, setPrayerTitle] = useState("");
  const [prayerSlug, setPrayerSlug] = useState("");
  const [prayerCategory, setPrayerCategory] = useState("general");
  const [prayerText, setPrayerText] = useState("");
  const [prayerScriptureId, setPrayerScriptureId] = useState("");
  const [prayerXp, setPrayerXp] = useState("20");
  const [prayerStatus, setPrayerStatus] = useState("draft");

  const [identityTitle, setIdentityTitle] = useState("");
  const [identitySlug, setIdentitySlug] = useState("");
  const [identityStatement, setIdentityStatement] = useState("");
  const [identityExplanation, setIdentityExplanation] = useState("");
  const [identityScriptureId, setIdentityScriptureId] = useState("");
  const [identitySayIt, setIdentitySayIt] = useState("");
  const [identitySort, setIdentitySort] = useState("0");
  const [identityStatus, setIdentityStatus] = useState("draft");

  const load = useCallback(async () => {
    const [scriptureResult, seriesResult] = await Promise.all([
      supabase.from("scripture_passages").select("id,reference,translation,verse_text,theme_key,status").order("reference"),
      supabase.from("devotional_series").select("id,title,status").order("created_at", { ascending: false })
    ]);
    const error = scriptureResult.error || seriesResult.error;
    if (error) {
      setMessage(error.message);
      return;
    }
    const nextScriptures = (scriptureResult.data ?? []) as Scripture[];
    const nextSeries = (seriesResult.data ?? []) as DevotionalSeries[];
    setScriptures(nextScriptures);
    setSeries(nextSeries);
    if (!powerScriptureId && nextScriptures[0]) setPowerScriptureId(nextScriptures[0].id);
    if (!dayScriptureId && nextScriptures[0]) setDayScriptureId(nextScriptures[0].id);
    if (!prayerScriptureId && nextScriptures[0]) setPrayerScriptureId(nextScriptures[0].id);
    if (!identityScriptureId && nextScriptures[0]) setIdentityScriptureId(nextScriptures[0].id);
    if (!selectedSeriesId && nextSeries[0]) setSelectedSeriesId(nextSeries[0].id);
  }, [powerScriptureId,dayScriptureId,prayerScriptureId,identityScriptureId,selectedSeriesId]);

  useEffect(() => { void load(); }, [load]);

  async function createScripture(event: FormEvent) {
    event.preventDefault(); setWorking(true); setMessage("");
    const { error } = await supabase.rpc("admin_create_scripture", {
      p_reference: reference, p_translation: translation, p_verse_text: verseText,
      p_theme_key: theme || undefined, p_status: "published"
    });
    setWorking(false);
    if (error) return setMessage(error.message);
    setReference(""); setVerseText(""); setTheme("");
    setMessage("Scripture saved.");
    await load();
  }

  async function createPowerVerse(event: FormEvent) {
    event.preventDefault(); setWorking(true); setMessage("");
    const { error } = await supabase.rpc("admin_create_power_verse", {
      p_scripture_id: powerScriptureId,
      p_title: powerTitle,
      p_slug: powerSlug || slugify(powerTitle),
      p_explanation: powerExplanation || undefined,
      p_say_it: sayIt || undefined,
      p_live_it: liveIt || undefined,
      p_give_it_away: giveItAway || undefined,
      p_memorize_xp: Number(memorizeXp) || 0,
      p_access_level: "free",
      p_status: powerStatus,
      p_is_featured: powerFeatured
    });
    setWorking(false);
    if (error) return setMessage(error.message);
    setPowerTitle(""); setPowerSlug(""); setPowerExplanation(""); setSayIt(""); setLiveIt(""); setGiveItAway(""); setPowerFeatured(false);
    setMessage("Power Verse created.");
  }

  async function createSeries(event: FormEvent) {
    event.preventDefault(); setWorking(true); setMessage("");
    const { data, error } = await supabase.rpc("admin_create_devotional_series", {
      p_title: seriesTitle,
      p_slug: seriesSlug || slugify(seriesTitle),
      p_description: seriesDescription || undefined,
      p_access_level: "free",
      p_status: seriesStatus,
      p_is_featured: false
    });
    setWorking(false);
    if (error) return setMessage(error.message);
    setSeriesTitle(""); setSeriesSlug(""); setSeriesDescription("");
    setMessage("Devotional series created.");
    await load();
    if (typeof data === "string") setSelectedSeriesId(data);
  }

  async function addDay(event: FormEvent) {
    event.preventDefault(); setWorking(true); setMessage("");
    const { error } = await supabase.rpc("admin_add_devotional_day", {
      p_series_id: selectedSeriesId,
      p_day_number: Number(dayNumber),
      p_title: dayTitle,
      p_body: dayBody,
      p_scripture_id: dayScriptureId || undefined,
      p_prayer_prompt: dayPrayer || undefined,
      p_action_step: dayAction || undefined,
      p_xp_reward: Number(dayXp) || 0
    });
    setWorking(false);
    if (error) return setMessage(error.message);
    setDayTitle(""); setDayBody(""); setDayPrayer(""); setDayAction(""); setDayNumber(String(Number(dayNumber)+1));
    setMessage("Devotional day added.");
  }

  async function createPrayer(event: FormEvent) {
    event.preventDefault(); setWorking(true); setMessage("");
    const { error } = await supabase.rpc("admin_create_prayer_prompt", {
      p_title: prayerTitle,
      p_slug: prayerSlug || slugify(prayerTitle),
      p_prompt_text: prayerText,
      p_category: prayerCategory,
      p_scripture_id: prayerScriptureId || undefined,
      p_xp_reward: Number(prayerXp) || 0,
      p_access_level: "free",
      p_status: prayerStatus
    });
    setWorking(false);
    if (error) return setMessage(error.message);
    setPrayerTitle(""); setPrayerSlug(""); setPrayerText("");
    setMessage("Prayer prompt created.");
  }

  async function createIdentity(event: FormEvent) {
    event.preventDefault(); setWorking(true); setMessage("");
    const { error } = await supabase.rpc("admin_create_identity_truth", {
      p_title: identityTitle,
      p_slug: identitySlug || slugify(identityTitle),
      p_statement: identityStatement,
      p_explanation: identityExplanation || undefined,
      p_scripture_id: identityScriptureId || undefined,
      p_say_it: identitySayIt || undefined,
      p_sort_order: Number(identitySort) || 0,
      p_access_level: "free",
      p_status: identityStatus
    });
    setWorking(false);
    if (error) return setMessage(error.message);
    setIdentityTitle(""); setIdentitySlug(""); setIdentityStatement(""); setIdentityExplanation(""); setIdentitySayIt("");
    setMessage("Identity truth created.");
  }

  const scriptureOptions = (
    <>
      <option value="">No Scripture link</option>
      {scriptures.map((item) => <option key={item.id} value={item.id}>{item.reference} · {item.translation}</option>)}
    </>
  );

  return (
    <div className="faith-admin">
      <nav className="admin-inline-tabs">
        {[
          ["scripture","Scripture"],["power","Power Verses"],["devotional","Devotionals"],["prayer","Prayer"],["identity","Identity"]
        ].map(([key,label]) => (
          <button key={key} className={tab===key ? "active" : ""} onClick={() => setTab(key as typeof tab)}>{label}</button>
        ))}
      </nav>
      {message && <div className="form-message">{message}</div>}

      {tab==="scripture" && (
        <section className="admin-card">
          <p className="eyebrow red">Bible Library</p><h2>Add Scripture</h2>
          <form className="admin-form" onSubmit={createScripture}>
            <label>Reference<input required value={reference} onChange={e=>setReference(e.target.value)} placeholder="2 Timothy 1:7" /></label>
            <label>Translation<input required value={translation} onChange={e=>setTranslation(e.target.value)} /></label>
            <label>Theme<input value={theme} onChange={e=>setTheme(e.target.value)} placeholder="courage" /></label>
            <label className="full">Verse text<textarea required value={verseText} onChange={e=>setVerseText(e.target.value)} /></label>
            <button className="primary-button full" disabled={working}>Save Scripture</button>
          </form>
        </section>
      )}

      {tab==="power" && (
        <section className="admin-card">
          <p className="eyebrow gold">Kid Bible</p><h2>Create Power Verse</h2>
          <form className="admin-form" onSubmit={createPowerVerse}>
            <label className="full">Scripture<select required value={powerScriptureId} onChange={e=>setPowerScriptureId(e.target.value)}>{scriptureOptions}</select></label>
            <label>Title<input required value={powerTitle} onChange={e=>{setPowerTitle(e.target.value); if(!powerSlug)setPowerSlug(slugify(e.target.value));}} /></label>
            <label>Slug<input required value={powerSlug} onChange={e=>setPowerSlug(slugify(e.target.value))} /></label>
            <label className="full">Kid explanation<textarea value={powerExplanation} onChange={e=>setPowerExplanation(e.target.value)} /></label>
            <label className="full">Say It<textarea value={sayIt} onChange={e=>setSayIt(e.target.value)} /></label>
            <label className="full">Live It<textarea value={liveIt} onChange={e=>setLiveIt(e.target.value)} /></label>
            <label className="full">Give It Away<textarea value={giveItAway} onChange={e=>setGiveItAway(e.target.value)} /></label>
            <label>Memorize XP<input type="number" min="0" value={memorizeXp} onChange={e=>setMemorizeXp(e.target.value)} /></label>
            <label>Status<select value={powerStatus} onChange={e=>setPowerStatus(e.target.value)}><option value="draft">Draft</option><option value="published" disabled>Publish through DC Governance</option></select></label>
            <label className="admin-check full"><input type="checkbox" checked={powerFeatured} onChange={e=>setPowerFeatured(e.target.checked)} /> Featured Power Verse</label>
            <button className="primary-button full" disabled={working}>Create Power Verse</button>
          </form>
        </section>
      )}

      {tab==="devotional" && (
        <div className="admin-two-column">
          <section className="admin-card">
            <p className="eyebrow red">Devotional</p><h2>Create Series</h2>
            <form className="admin-form" onSubmit={createSeries}>
              <label>Title<input required value={seriesTitle} onChange={e=>{setSeriesTitle(e.target.value); if(!seriesSlug)setSeriesSlug(slugify(e.target.value));}} /></label>
              <label>Slug<input required value={seriesSlug} onChange={e=>setSeriesSlug(slugify(e.target.value))} /></label>
              <label className="full">Description<textarea value={seriesDescription} onChange={e=>setSeriesDescription(e.target.value)} /></label>
              <label>Status<select value={seriesStatus} onChange={e=>setSeriesStatus(e.target.value)}><option value="draft">Draft</option><option value="published" disabled>Publish through DC Governance</option></select></label>
              <button className="primary-button full" disabled={working}>Create Series</button>
            </form>
          </section>
          <section className="admin-card">
            <p className="eyebrow gold">Devotional</p><h2>Add Day</h2>
            <form className="admin-form" onSubmit={addDay}>
              <label className="full">Series<select required value={selectedSeriesId} onChange={e=>setSelectedSeriesId(e.target.value)}><option value="">Select series</option>{series.map(item=><option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
              <label>Day<input type="number" min="1" value={dayNumber} onChange={e=>setDayNumber(e.target.value)} /></label>
              <label>XP<input type="number" min="0" value={dayXp} onChange={e=>setDayXp(e.target.value)} /></label>
              <label className="full">Title<input required value={dayTitle} onChange={e=>setDayTitle(e.target.value)} /></label>
              <label className="full">Scripture<select value={dayScriptureId} onChange={e=>setDayScriptureId(e.target.value)}>{scriptureOptions}</select></label>
              <label className="full">Body<textarea required value={dayBody} onChange={e=>setDayBody(e.target.value)} /></label>
              <label className="full">Prayer prompt <span className="optional">(must begin “Dear God,”)</span><textarea value={dayPrayer} onChange={e=>setDayPrayer(e.target.value)} placeholder="Dear God, ..." /></label>
              <label className="full">Action step<textarea value={dayAction} onChange={e=>setDayAction(e.target.value)} /></label>
              <button className="secondary-button full" disabled={working}>Add Devotional Day</button>
            </form>
          </section>
        </div>
      )}

      {tab==="prayer" && (
        <section className="admin-card">
          <p className="eyebrow gold">Guided Prayer</p><h2>Create Prayer Prompt</h2>
          <form className="admin-form" onSubmit={createPrayer}>
            <label>Title<input required value={prayerTitle} onChange={e=>{setPrayerTitle(e.target.value); if(!prayerSlug)setPrayerSlug(slugify(e.target.value));}} /></label>
            <label>Slug<input required value={prayerSlug} onChange={e=>setPrayerSlug(slugify(e.target.value))} /></label>
            <label>Category<input value={prayerCategory} onChange={e=>setPrayerCategory(e.target.value)} /></label>
            <label>XP<input type="number" min="0" value={prayerXp} onChange={e=>setPrayerXp(e.target.value)} /></label>
            <label className="full">Scripture<select value={prayerScriptureId} onChange={e=>setPrayerScriptureId(e.target.value)}>{scriptureOptions}</select></label>
            <label className="full">Prayer <span className="optional">(must begin “Dear God,”)</span><textarea required value={prayerText} onChange={e=>setPrayerText(e.target.value)} placeholder="Dear God, ..." /></label>
            <label>Status<select value={prayerStatus} onChange={e=>setPrayerStatus(e.target.value)}><option value="draft">Draft</option><option value="published" disabled>Publish through DC Governance</option></select></label>
            <button className="primary-button full" disabled={working}>Create Prayer Prompt</button>
          </form>
        </section>
      )}

      {tab==="identity" && (
        <section className="admin-card">
          <p className="eyebrow red">Identity in Christ</p><h2>Create Identity Truth</h2>
          <form className="admin-form" onSubmit={createIdentity}>
            <label>Title<input required value={identityTitle} onChange={e=>{setIdentityTitle(e.target.value); if(!identitySlug)setIdentitySlug(slugify(e.target.value));}} /></label>
            <label>Slug<input required value={identitySlug} onChange={e=>setIdentitySlug(slugify(e.target.value))} /></label>
            <label className="full">Identity statement<input required value={identityStatement} onChange={e=>setIdentityStatement(e.target.value)} /></label>
            <label className="full">Scripture<select value={identityScriptureId} onChange={e=>setIdentityScriptureId(e.target.value)}>{scriptureOptions}</select></label>
            <label className="full">Explanation<textarea value={identityExplanation} onChange={e=>setIdentityExplanation(e.target.value)} /></label>
            <label className="full">Say It<textarea value={identitySayIt} onChange={e=>setIdentitySayIt(e.target.value)} /></label>
            <label>Sort order<input type="number" value={identitySort} onChange={e=>setIdentitySort(e.target.value)} /></label>
            <label>Status<select value={identityStatus} onChange={e=>setIdentityStatus(e.target.value)}><option value="draft">Draft</option><option value="published" disabled>Publish through DC Governance</option></select></label>
            <button className="primary-button full" disabled={working}>Create Identity Truth</button>
          </form>
        </section>
      )}
    </div>
  );
}
