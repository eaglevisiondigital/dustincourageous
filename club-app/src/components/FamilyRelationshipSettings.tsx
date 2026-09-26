import { useCallback, useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { adultSignupMetadata, adultDetailsChanged, exportAdultDetails, readAdultDetails, saveAdultDetails, type AdultDetails } from "../lib/adultSignup";

export function FamilyRelationshipSettings({ user }: { user: User }) {
  const [details, setDetails] = useState<AdultDetails>({ firstName: "", lastName: "", cellPhone: "", relationship: "", email: "" });
  const [savedDetails, setSavedDetails] = useState<AdultDetails | null>(null);
  const [confirmRefresh, setConfirmRefresh] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState("");
  const [exporting, setExporting] = useState(false);
  const dirty = adultDetailsChanged(savedDetails, details);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");
  const busy = useRef(false);
  const version = useRef(0);
  const load = useCallback(async () => {
    const request = ++version.current;
    setLoading(true); setLoadError(false); setDownloadUrl("");
    try { const next = await readAdultDetails(supabase, user.id); if (request === version.current) { setDetails(next); setSavedDetails(next); setConfirmRefresh(false); } }
    catch { if (request === version.current) setLoadError(true); }
    finally { if (request === version.current) setLoading(false); }
  }, [user.id]);
  useEffect(() => { void load(); return () => { version.current++; }; }, [load]);
  useEffect(() => () => { if (downloadUrl) URL.revokeObjectURL(downloadUrl); }, [downloadUrl]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  const change = (key: keyof AdultDetails, value: string) => { setDetails(current => ({ ...current, [key]: value })); setMessage(""); setConfirmRefresh(false); };
  async function save() {
    if (busy.current || loading || loadError || exporting) return;
    try { adultSignupMetadata(details.firstName, details.lastName, details.cellPhone, details.relationship); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Check your details."); return; }
    busy.current = true; setWorking(true); setMessage(""); setDownloadUrl("");
    try {
      await saveAdultDetails(supabase, user.id, details);
      setSavedDetails({ ...details });
      setConfirmRefresh(false);
      setMessage("Your name, contact number and family label have been saved.");
    } catch {
      setMessage("We could not confirm all details were saved. Some changes may have saved. Retry with these details, or refresh to check your saved information.");
    } finally { busy.current = false; setWorking(false); }
  }
  async function downloadDetails() {
    if (busy.current || loading) return;
    busy.current = true; setExporting(true); setMessage(""); setDownloadUrl("");
    const request = version.current;
    try {
      const payload = await exportAdultDetails(supabase, user.id);
      if (request !== version.current) return;
      const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
      setDownloadUrl(url);
      setMessage("Your saved account details are ready. Use Download Saved Details below. Unsaved edits are not included.");
    } catch { if (request === version.current) setMessage("We could not download your saved details. Try again when your connection is available."); }
    finally { busy.current = false; setExporting(false); }
  }
  return <section className="settings-card">
    <p className="eyebrow gold">Adult Account</p><h2>Your Account Details</h2>
    <p className="muted">Update your information and choose how your control badge appears in the Family Hub.</p>
    {loading ? <p role="status">Loading account details...</p> : loadError ? <p role="alert">Your account details could not be loaded. Refresh to try again.</p> : <form className="form-stack" onSubmit={event => { event.preventDefault(); void save(); }}>
      <label>Adult First Name<input required autoComplete="given-name" maxLength={80} value={details.firstName} disabled={working || exporting} onChange={event => change("firstName", event.target.value)}/></label>
      <label>Adult Last Name<input required autoComplete="family-name" maxLength={80} value={details.lastName} disabled={working || exporting} onChange={event => change("lastName", event.target.value)}/></label>
      <label>Account Email<input type="email" readOnly value={details.email}/></label>
      <label>Cell Phone (Optional)<input type="tel" autoComplete="tel" maxLength={40} value={details.cellPhone} disabled={working || exporting} aria-describedby="account-phone-help" onChange={event => change("cellPhone", event.target.value)}/></label>
      <p id="account-phone-help" className="muted">Use your adult contact number. Leave blank to remove it. This does not enable text messages or phone sign-in.</p>
      <label>I Am A<select required value={details.relationship} disabled={working || exporting} onChange={event => change("relationship", event.target.value)}><option value="" disabled>Choose Parent Or Guardian</option><option value="parent">Parent</option><option value="guardian">Guardian</option></select></label>
      <button className="primary-button" disabled={working || exporting}>{working ? "Saving..." : "Save Account Details"}</button>
    </form>}
    {dirty && <p role="status">You have unsaved changes. Save before leaving this section.</p>}
    {message && <p role="status">{message}</p>}
    <div className="family-action-buttons adult-account-actions">
      <button type="button" className="text-button" disabled={working || exporting || loading} onClick={() => { if (dirty) setConfirmRefresh(true); else { setMessage(""); void load(); } }}>Refresh Account Details</button>
      <button type="button" className="secondary-button" disabled={working || exporting || loading} onClick={() => void downloadDetails()}>{exporting ? "Preparing Download..." : "Download My Account Details"}</button>
    </div>
    {downloadUrl && <p><a className="secondary-button adult-account-download" href={downloadUrl} download="dc-adult-account-details.json">Download Saved Details</a></p>}
    {confirmRefresh && <div role="group" aria-label="Discard Unsaved Account Changes">
      <p>Refreshing will replace your unsaved edits with your saved account details.</p>
      <div className="family-action-buttons adult-account-actions">
        <button type="button" className="secondary-button" disabled={working || exporting || loading} onClick={() => { setMessage(""); void load(); }}>Discard Edits And Refresh</button>
        <button type="button" className="text-button" onClick={() => setConfirmRefresh(false)}>Keep Editing</button>
      </div>
    </div>}
    <p className="muted">This download contains your saved adult name, email, optional contact number and Parent or Guardian choice. For household and child records, use Privacy &amp; Data Controls.</p>
  </section>;
}
