import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

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
  return typeof value === "string" ? value : null;
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
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [category, setCategory] = useState("all");
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");

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
      setError((itemResult.error || progressResult.error)!.message);
      return;
    }

    const nextItems = (itemResult.data ?? []) as ContentItem[];
    setItems(nextItems);
    setProgress((progressResult.data ?? []) as Progress[]);

    const assetKeys = Array.from(new Set(nextItems.map((item) => item.asset_key).filter((value): value is string => !!value)));
    if (!assetKeys.length) {
      setAssets([]);
      setUrls({});
      return;
    }

    const { data: assetData, error: assetError } = await supabase
      .from("media_assets")
      .select("asset_key,bucket_name,object_path,visibility,media_type")
      .in("asset_key", assetKeys)
      .eq("status", "ready");

    if (assetError) {
      setError(assetError.message);
      return;
    }

    const nextAssets = (assetData ?? []) as MediaAsset[];
    setAssets(nextAssets);

    const nextUrls: Record<string, string> = {};
    await Promise.all(nextAssets.map(async (asset) => {
      if (asset.bucket_name === "dc-public") {
        nextUrls[asset.asset_key] = supabase.storage
          .from("dc-public")
          .getPublicUrl(asset.object_path).data.publicUrl;
      } else {
        const { data } = await supabase.storage
          .from(asset.bucket_name)
          .createSignedUrl(asset.object_path, 900);
        if (data?.signedUrl) nextUrls[asset.asset_key] = data.signedUrl;
      }
    }));
    setUrls(nextUrls);
  }, [childId]);

  useEffect(() => {
    void load();
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

  function itemUrl(item: ContentItem) {
    if (item.asset_key && urls[item.asset_key]) return urls[item.asset_key];
    return externalUrl(item.body);
  }

  async function complete(item: ContentItem) {
    if (progressMap.get(item.id)?.status === "completed") return;

    setWorkingId(item.id);
    setError("");

    const existing = progressMap.get(item.id);
    const { error: saveError } = await supabase
      .from("child_content_progress")
      .upsert(
        {
          child_profile_id: childId,
          content_item_id: item.id,
          status: "completed",
          started_at: existing ? undefined : new Date().toISOString(),
          completed_at: existing?.completed_at ?? new Date().toISOString()
        },
        { onConflict: "child_profile_id,content_item_id" }
      );

    setWorkingId(null);

    if (saveError) {
      setError(saveError.message);
      return;
    }

    await load();
    await onProgress();
  }

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

      {error && <div className="form-message">{error}</div>}

      <nav className="activity-filters" aria-label="Activity categories">
        {categories.map((item) => (
          <button
            key={item}
            type="button"
            className={category === item ? "active" : ""}
            onClick={() => setCategory(item)}
          >
            {item.replaceAll("_", " ")}
          </button>
        ))}
      </nav>

      <section className="activity-grid">
        {visibleItems.map((item) => {
          const done = progressMap.get(item.id)?.status === "completed";
          const url = itemUrl(item);

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
                {url ? (
                  <a className="secondary-button activity-link" href={url} target="_blank" rel="noreferrer">
                    {item.content_type === "video" ? "Watch" : item.content_type === "audio" ? "Listen" : "Open"}
                  </a>
                ) : (
                  <button className="secondary-button" disabled>Asset coming soon</button>
                )}
                <button
                  className={done ? "status-chip done" : "text-button small"}
                  disabled={done || workingId === item.id}
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
