import { useCallback, useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { adultSignupMetadata, readAdultDetails, saveAdultDetails, type AdultDetails } from "../lib/adultSignup";

export function FamilyRelationshipSettings({ user }: { user: User }) {
  const [details, setDetails] = useState<AdultDetails>({ firstName: "", lastName: "", cellPhone: "", relationship: "guardian", email: "" });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");
  const busy = useRef(false);
  const version = useRef(0);
  const load = useCallback(async () => {
    const request = ++version.current;
    setLoading(true); setLoadError(false);
    try { const next = await readAdultDetails(supabase, user.id); if (request === version.current) setDetails(next); }
    catch { if (request === version.current) setLoadError(true); }
    finally { if (request === version.current) setLoading(false); }
  }, [user.id]);
  useEffect(() => { void load(); return () => { version.current++; }; }, [load]);
  const change = (key: keyof AdultDetails, value: string) => { setDetails(current => ({ ...current, [key]: value })); setMessage(""); };
  async function save() {
    if (busy.current || loading || loadError) return;
    try { adultSignupMetadata(details.firstName, details.lastName, details.cellPhone, details.relationship); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Check your details."); return; }
    busy.current = true; setWorking(true); setMessage("");
    try {
      await saveAdultDetails(supabase, user.id, details);
      setMessage("Your name, contact number and family label have been saved.");
    } catch {
      setMessage("We could not confirm all details were saved. Some changes may have saved. Retry with these details, or refresh to check your saved information.");
    } finally { busy.current = false; setWorking(false); }
  }
  return <section className="settings-card">
    <p className="eyebrow gold">Adult Account</p><h2>Your Account Details</h2>
    <p className="muted">Update your information and choose how your control badge appears in the Family Hub.</p>
    {loading ? <p role="status">Loading account details...</p> : loadError ? <p role="alert">Your account details could not be loaded. Refresh to try again.</p> : <form className="form-stack" onSubmit={event => { event.preventDefault(); void save(); }}>
      <label>Adult First Name<input required autoComplete="given-name" maxLength={80} value={details.firstName} disabled={working} onChange={event => change("firstName", event.target.value)}/></label>
      <label>Adult Last Name<input required autoComplete="family-name" maxLength={80} value={details.lastName} disabled={working} onChange={event => change("lastName", event.target.value)}/></label>
      <label>Account Email<input type="email" readOnly value={details.email}/></label>
      <label>Cell Phone (Optional)<input type="tel" autoComplete="tel" maxLength={40} value={details.cellPhone} disabled={working} aria-describedby="account-phone-help" onChange={event => change("cellPhone", event.target.value)}/></label>
      <p id="account-phone-help" className="muted">Use your adult contact number. Leave blank to remove it. This does not enable text messages or phone sign-in.</p>
      <label>I Am A<select value={details.relationship} disabled={working} onChange={event => change("relationship", event.target.value)}><option value="parent">Parent</option><option value="guardian">Guardian</option></select></label>
      <button className="primary-button" disabled={working}>{working ? "Saving..." : "Save Account Details"}</button>
    </form>}
    {message && <p role="status">{message}</p>}
    <button type="button" className="text-button" disabled={working || loading} onClick={() => { setMessage(""); void load(); }}>Refresh Account Details</button>
  </section>;
}
