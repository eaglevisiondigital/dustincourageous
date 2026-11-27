import { FormEvent, useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Asset = {
  asset_key: string;
  title: string | null;
  media_type: string;
  visibility: string;
};

type Content = {
  id: string;
  title: string;
  content_type: string;
  category: string;
  access_level: string;
  status: string;
  completion_xp: number;
  asset_key: string | null;
};

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
}

export function ContentAdmin() {
  const [assets,setAssets]=useState<Asset[]>([]);
  const [items,setItems]=useState<Content[]>([]);
  const [type,setType]=useState("download");
  const [title,setTitle]=useState("");
  const [slug,setSlug]=useState("");
  const [summary,setSummary]=useState("");
  const [category,setCategory]=useState("general");
  const [assetKey,setAssetKey]=useState("");
  const [externalUrl,setExternalUrl]=useState("");
  const [access,setAccess]=useState("free");
  const [status,setStatus]=useState("draft");
  const [featured,setFeatured]=useState(false);
  const [xp,setXp]=useState("0");
  const [working,setWorking]=useState(false);
  const [message,setMessage]=useState("");

  const load=useCallback(async()=>{
    const [assetResult,itemResult]=await Promise.all([
      supabase.from("media_assets").select("asset_key,title,media_type,visibility").eq("status","ready").order("created_at",{ascending:false}),
      supabase.from("content_items").select("id,title,content_type,category,access_level,status,completion_xp,asset_key").order("created_at",{ascending:false}).limit(100)
    ]);
    const error=assetResult.error||itemResult.error;
    if(error)return setMessage(error.message);
    setAssets((assetResult.data??[]) as Asset[]);
    setItems((itemResult.data??[]) as Content[]);
  },[]);

  useEffect(()=>{void load();},[load]);

  async function submit(event:FormEvent){
    event.preventDefault();setWorking(true);setMessage("");
    const body=externalUrl.trim()?{external_url:externalUrl.trim()}:{};
    const {error}=await supabase.rpc("admin_create_content_item",{
      p_content_type:type,
      p_title:title,
      p_slug:slug||slugify(title),
      p_summary:summary||undefined,
      p_category:category||"general",
      p_asset_key:assetKey||undefined,
      p_thumbnail_asset_key:undefined,
      p_access_level:access,
      p_status:status,
      p_is_featured:featured,
      p_completion_xp:Number(xp)||0,
      p_body:body
    });
    setWorking(false);
    if(error)return setMessage(error.message);
    setTitle("");setSlug("");setSummary("");setAssetKey("");setExternalUrl("");setFeatured(false);
    setMessage("Content item created.");
    await load();
  }

  return (
    <div className="admin-two-column">
      <section className="admin-card">
        <p className="eyebrow red">Content Studio</p>
        <h2>Create Activity / Media Content</h2>
        <form className="admin-form" onSubmit={submit}>
          <label>Type<select value={type} onChange={e=>setType(e.target.value)}><option value="download">Download</option><option value="activity">Activity</option><option value="video">Video</option><option value="audio">Audio</option><option value="article">Article</option><option value="quiz">Quiz</option><option value="other">Other</option></select></label>
          <label>Category<input value={category} onChange={e=>setCategory(e.target.value)} placeholder="coloring"/></label>
          <label className="full">Title<input required value={title} onChange={e=>{setTitle(e.target.value);if(!slug)setSlug(slugify(e.target.value));}}/></label>
          <label className="full">Slug<input required value={slug} onChange={e=>setSlug(slugify(e.target.value))}/></label>
          <label className="full">Summary<textarea value={summary} onChange={e=>setSummary(e.target.value)}/></label>
          <label className="full">Adventure Club media asset<select value={assetKey} onChange={e=>setAssetKey(e.target.value)}><option value="">No uploaded asset</option>{assets.map(asset=><option key={asset.asset_key} value={asset.asset_key}>{asset.title||asset.asset_key} · {asset.visibility}</option>)}</select></label>
          <label className="full">Or external URL<input type="url" value={externalUrl} onChange={e=>setExternalUrl(e.target.value)} placeholder="https://..."/></label>
          <label>Access<select value={access} onChange={e=>setAccess(e.target.value)}><option value="free">Free access</option><option value="member">All signed-in families</option><option value="premium">Paid membership</option></select></label>
          <label>Status<select value={status} onChange={e=>setStatus(e.target.value)}><option value="draft">Draft</option><option value="published" disabled>Publish through DC Governance</option></select></label>
          <label>Completion XP<input type="number" min="0" value={xp} onChange={e=>setXp(e.target.value)}/></label>
          <label className="admin-check"><input type="checkbox" checked={featured} onChange={e=>setFeatured(e.target.checked)}/> Featured</label>
          <button className="primary-button full" disabled={working}>Create Content Item</button>
        </form>
        {message&&<div className="form-message" style={{marginTop:14}}>{message}</div>}
      </section>

      <section className="admin-card">
        <div className="section-heading compact-heading"><div><p className="eyebrow gold">Library</p><h2>Adventure Content</h2></div><span className="pill">{items.length} recent</span></div>
        <div className="admin-list">
          {items.map(item=>(
            <article className="admin-list-row" key={item.id}>
              <div><strong>{item.title}</strong><small>{item.content_type} · {item.category} · {item.access_level} · {item.completion_xp} XP{item.asset_key?` · ${item.asset_key}`:""}</small></div>
              <span className={item.status==="published"?"status-chip done":"status-chip"}>{item.status}</span>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
