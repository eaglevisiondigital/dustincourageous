import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { activityAssetUrl, activityExternalUrl, completeActivity } from "../lib/activityActions";

type ContentItem = {
  id: string;
  title: string;
  summary: string | null;
  content_type: string;
  category: string;
  asset_key: string | null;
  access_level: string;
  is_featured: boolean;
  completion_xp: number;
  body: Record<string, unknown> | null;
};

type MediaAsset = {
  asset_key: string;
  bucket_name: string;
  object_path: string;
  visibility: string;
  media_type: string;
};

type Progress = {
  content_item_id: string;
  status: string;
  completed_at: string | null;
};

function externalUrl(body: Record<string, unknown> | null) {
  const value = body?.external_url;
  return activityExternalUrl(value);
}

export function ActivitiesHub({
  childId,
  childName,
  onProgress
}: {
  childId: string;
  childName: string;
  onProgress: () => Promise<void>;
}) {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [progress, setProgress] = useState<Progress[]>([]);
  const [readyLink, setReadyLink] = useState<{id:string;url:string}|null>(null);
  const [category, setCategory] = useState("all");
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const [loading,setLoading] = useState(true);
  const [loadError,setLoadError] = useState("");
  const loadVersion = useRef(0);
  const actionBusy = useRef(false);

  const load = useCallback(async () => {
    const version=++loadVersion.current;
    setLoading(true);setLoadError("");setReadyLink(null);
    try {

    const [itemResult, progressResult] = await Promise.all([
      supabase
        .from("content_items")
        .select("id,title,summary,content_type,category,asset_key,access_level,is_featured,completion_xp,body")
        .eq("status", "published")
        .in("content_type", ["download","activity","video","audio","article","quiz","other"])
        .order("is_featured", { ascending: false })
        .order("created_at", { ascending: false }),
      supabase
        .from("child_content_progress")
        .select("content_item_id,status,completed_at")
        .eq("child_profile_id", childId)
    ]);

    if (itemResult.error || progressResult.error) {
      throw itemResult.error || progressResult.error;
    }

    const nextItems = (itemResult.data ?? []) as ContentItem[];
    if(version!==loadVersion.current)return;

    const assetKeys = Array.from(new Set(nextItems.map((item) => item.asset_key).filter((value): value is string => !!value)));
    if (!assetKeys.length) {
      setItems(nextItems);setProgress((progressResult.data ?? []) as Progress[]);
      setAssets([]);
      return;
    }

    const { data: assetData, error: assetError } = await supabase
      .from("media_assets")
      .select("asset_key,bucket_name,object_path,visibility,media_type")
      .in("asset_key", assetKeys)
      .eq("status", "ready");

    if(assetError)throw assetError;
    if(version!==loadVersion.current)return;
    setItems(nextItems);setProgress((progressResult.data ?? []) as Progress[]);
    setAssets((assetData ?? []) as MediaAsset[]);
    } catch {
      if(version===loadVersion.current)setLoadError("Activities could not be loaded. Please try again.");
    } finally {if(version===loadVersion.current)setLoading(false);}
  }, [childId]);

  useEffect(() => {
    void load();
    return ()=>{loadVersion.current++;};
  }, [load]);

  const progressMap = useMemo(
    () => new Map(progress.map((item) => [item.content_item_id, item])),
    [progress]
  );

  const categories = useMemo(
    () => ["all", ...Array.from(new Set(items.map((item) => item.category))).sort()],
    [items]
  );

  const visibleItems = category === "all" ? items : items.filter((item) => item.category === category);

  async function openActivity(item:ContentItem) {
    if(actionBusy.current)return;
    actionBusy.current=true;setWorkingId(item.id);setError("");setReadyLink(null);
    let tab:Window|null=null;
    try {
      tab=window.open("about:blank","_blank");
      if(tab)tab.opener=null;
      let url:string|null;
      if(item.asset_key) {
        const asset=assets.find(value=>value.asset_key===item.asset_key);
        if(!asset)throw new Error("Activity file unavailable.");
        url=await activityAssetUrl(supabase,asset);
      } else url=externalUrl(item.body);
      if(!url)throw new Error("Activity link unavailable.");
      if(tab&&!tab.closed)tab.location.href=url;
      else {setReadyLink({id:item.id,url});setError("Your activity is ready. Use the open link below.");}
    } catch {
      tab?.close();
      setError("This activity could not be opened. Please try again or ask your guardian for help.");
    } finally {actionBusy.current=false;setWorkingId(null);}
  }

  async function complete(item: ContentItem) {
    if(actionBusy.current||progressMap.get(item.id)?.status==="completed")return;
    actionBusy.current=true;setWorkingId(item.id);setError("");
    let saved=false;
    try {
      await completeActivity(supabase,childId,item.id);
      saved=true;
      setProgress(current=>[...current.filter(row=>row.content_item_id!==item.id),{content_item_id:item.id,status:"completed",completed_at:new Date().toISOString()}]);
      window.dispatchEvent(new Event("dc-progress-updated"));
      await onProgress();
    } catch {
      setError(saved ? "Activity completed. Your progress totals could not refresh yet." : "Completion could not be confirmed. Refresh activities before trying again.");
    } finally {
      await load();actionBusy.current=false;setWorkingId(null);
    }
  }

  if(loading)return <section className="activities-hub" aria-busy="true"><p role="status">Loading activities...</p></section>;
  if(loadError)return <section className="activities-hub"><p role="alert">{loadError}</p><button className="secondary-button" disabled={workingId!==null} onClick={()=>void load()}>Try again</button></section>;

  return (
    <div className="activities-hub">
      <section className="activities-hero">
        <div>
          <p className="eyebrow gold">Activities</p>
          <h1>More Adventures for {childName}</h1>
          <p>Watch. Listen. Color. Print. Learn. Put courage into action.</p>
        </div>
        <div className="activities-mark">★</div>
      </section>

      {error && <div className="form-message" role="status">{error} <button className="text-button" disabled={workingId!==null} onClick={()=>void load()}>Refresh activities</button></div>}

      <nav className="activity-filters" aria-label="Activity categories">
        {categories.map((item) => (
          <button
            key={item}
            type="button"
            className={category === item ? "active" : ""}
            aria-pressed={category === item}
            disabled={workingId!==null}
            onClick={() => setCategory(item)}
          >
            {item.replaceAll("_", " ")}
          </button>
        ))}
      </nav>

      <section className="activity-grid">
        {visibleItems.map((item) => {
          const done = progressMap.get(item.id)?.status === "completed";
          const canOpen = item.asset_key ? assets.some(asset=>asset.asset_key===item.asset_key) : !!externalUrl(item.body);

          return (
            <article className={item.is_featured ? "activity-card featured" : "activity-card"} key={item.id}>
              <div className="activity-card-top">
                <span>{item.content_type}</span>
                <span className="status-chip">{item.access_level}</span>
              </div>
              <div className="activity-icon">
                {item.content_type === "video" ? "▶" : item.content_type === "audio" ? "♪" : item.content_type === "download" ? "↓" : "★"}
              </div>
              <h3>{item.title}</h3>
              <p>{item.summary || "A Dustin Courageous Adventure Club activity."}</p>
              <small>{item.category.replaceAll("_", " ")}</small>

              <div className="activity-actions">
                {canOpen ? (
                  <button className="secondary-button activity-link" disabled={workingId!==null} onClick={()=>void openActivity(item)}>
                    {workingId===item.id ? "Please wait..." : item.content_type === "video" ? "Watch" : item.content_type === "audio" ? "Listen" : "Open"}
                  </button>
                ) : (
                  <button className="secondary-button" disabled>File unavailable</button>
                )}
                {readyLink?.id===item.id&&<a className="secondary-button" href={readyLink.url} target="_blank" rel="noopener noreferrer">Open ready activity</a>}
                <button
                  className={done ? "status-chip done" : "text-button small"}
                  disabled={done || workingId !== null}
                  onClick={() => void complete(item)}
                >
                  {done ? "Completed ✓" : item.completion_xp > 0 ? `Complete · +${item.completion_xp} XP` : "Mark complete"}
                </button>
              </div>
            </article>
          );
        })}
      </section>

      {!visibleItems.length && (
        <div className="empty-state">
          <div className="empty-icon">★</div>
          <h3>More activities are coming.</h3>
          <p>New Dustin videos, printables, coloring pages, and downloads will appear here.</p>
        </div>
      )}
    </div>
  );
}
