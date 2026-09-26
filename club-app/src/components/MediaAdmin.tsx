import { FormEvent, useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type MediaAsset = {
  id: string;
  asset_key: string;
  title: string | null;
  bucket_name: string;
  object_path: string;
  media_type: string;
  visibility: string;
  entitlement_key: string | null;
  status: string;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-|-$/g, "");
}

function mediaTypeFromMime(mime: string) {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  if (mime === "application/pdf") return "pdf";
  return "other";
}

function folderForType(type: string) {
  if (type === "image") return "images";
  if (type === "video") return "videos";
  if (type === "audio") return "audio";
  if (type === "pdf") return "pdfs";
  return "files";
}

export function MediaAdmin() {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [title, setTitle] = useState("");
  const [assetKey, setAssetKey] = useState("");
  const [bucket, setBucket] = useState("dc-public");
  const [visibility, setVisibility] = useState("public");
  const [entitlement, setEntitlement] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("media_assets")
      .select("id,asset_key,title,bucket_name,object_path,media_type,visibility,entitlement_key,status,mime_type,size_bytes,created_at")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      setMessage(error.message);
      return;
    }

    setAssets((data ?? []) as MediaAsset[]);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!file) {
      setMessage("Choose a file first.");
      return;
    }

    setWorking(true);
    setMessage("");

    const mediaType = mediaTypeFromMime(file.type);
    const safeName = slugify(file.name) || "asset";
    const finalAssetKey = assetKey.trim() || slugify(title || safeName);
    const objectPath = `${folderForType(mediaType)}/${Date.now()}-${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(objectPath, file, {
        upsert: false,
        contentType: file.type || undefined,
        cacheControl: bucket === "dc-public" ? "31536000" : "3600"
      });

    if (uploadError) {
      setWorking(false);
      setMessage(uploadError.message);
      return;
    }

    const { error: assetError } = await supabase.from("media_assets").insert({
      asset_key: finalAssetKey,
      title: title.trim() || file.name,
      bucket_name: bucket,
      object_path: objectPath,
      media_type: mediaType,
      visibility: bucket === "dc-public" ? "public" : visibility,
      entitlement_key:
        bucket === "dc-members" && visibility === "premium"
          ? entitlement || "premium_content"
          : null,
      status: "ready",
      mime_type: file.type || null,
      size_bytes: file.size,
      metadata: {
        original_filename: file.name,
        uploaded_from: "adventure_club_admin"
      }
    });

    if (assetError) {
      await supabase.storage.from(bucket).remove([objectPath]);
      setWorking(false);
      setMessage(assetError.message);
      return;
    }

    setWorking(false);
    setTitle("");
    setAssetKey("");
    setFile(null);
    setMessage("Media asset uploaded and registered.");
    await load();
  }

  function publicUrl(asset: MediaAsset) {
    if (asset.bucket_name !== "dc-public") return null;
    return supabase.storage.from("dc-public").getPublicUrl(asset.object_path).data.publicUrl;
  }

  return (
    <div className="admin-two-column">
      <section className="admin-card">
        <p className="eyebrow red">Media Library</p>
        <h2>Upload Asset</h2>
        <p className="muted">
          Public files can be used for covers and shareable resources. Protected files stay inside member access rules.
        </p>

        <form className="admin-form" onSubmit={submit}>
          <label className="full">
            File
            <input
              required
              type="file"
              accept="image/*,application/pdf,audio/*,video/mp4"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
          </label>
          <label>
            Title
            <input value={title} onChange={(event) => setTitle(event.target.value)} />
          </label>
          <label>
            Asset key
            <input
              value={assetKey}
              onChange={(event) => setAssetKey(slugify(event.target.value))}
              placeholder="book-1-power-verse-pdf"
            />
          </label>
          <label>
            Bucket
            <select
              value={bucket}
              onChange={(event) => {
                const next = event.target.value;
                setBucket(next);
                if (next === "dc-public") setVisibility("public");
                else if (visibility === "public") setVisibility("member");
              }}
            >
              <option value="dc-public">Public</option>
              <option value="dc-members">Members</option>
            </select>
          </label>

          {bucket === "dc-members" && (
            <label>
              Access
              <select value={visibility} onChange={(event) => setVisibility(event.target.value)}>
                <option value="member">All signed-in families</option>
                <option value="premium">Paid membership</option>
                <option value="private">Admin only</option>
              </select>
            </label>
          )}

          {bucket === "dc-members" && visibility === "premium" && (
            <label className="full">
              Entitlement key
              <input
                value={entitlement}
                onChange={(event) => setEntitlement(event.target.value)}
                placeholder="premium_content"
              />
            </label>
          )}

          <button className="primary-button full" disabled={working || !file}>
            {working ? "Uploading..." : "Upload and Register"}
          </button>
        </form>

        {message && <div className="form-message" style={{ marginTop: 14 }}>{message}</div>}
      </section>

      <section className="admin-card">
        <div className="section-heading compact-heading">
          <div>
            <p className="eyebrow gold">Assets</p>
            <h2>Media Library</h2>
          </div>
          <span className="pill">{assets.length} recent</span>
        </div>

        <div className="admin-list">
          {assets.map((asset) => {
            const url = publicUrl(asset);
            return (
              <article className="media-admin-row" key={asset.id}>
                <div className="media-admin-icon">
                  {asset.media_type === "image"
                    ? "IMG"
                    : asset.media_type === "video"
                      ? "VID"
                      : asset.media_type === "audio"
                        ? "AUD"
                        : asset.media_type === "pdf"
                          ? "PDF"
                          : "FILE"}
                </div>
                <div>
                  <strong>{asset.title || asset.asset_key}</strong>
                  <small>{asset.asset_key}</small>
                  <small>{asset.bucket_name}/{asset.object_path}</small>
                  <small>
                    {asset.visibility} · {asset.mime_type || asset.media_type}
                    {asset.size_bytes ? ` · ${Math.round(asset.size_bytes / 1024)} KB` : ""}
                  </small>
                  {url && (
                    <a href={url} target="_blank" rel="noreferrer">Open public asset</a>
                  )}
                </div>
                <span className={asset.status === "ready" ? "status-chip done" : "status-chip"}>
                  {asset.status}
                </span>
              </article>
            );
          })}
          {!assets.length && <p className="muted">No Adventure Club media has been uploaded yet.</p>}
        </div>
      </section>
    </div>
  );
}
