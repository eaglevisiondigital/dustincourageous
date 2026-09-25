import { useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { familyRelationship, type FamilyRelationship } from "../lib/familyDisplay";

export function FamilyRelationshipSettings({ user }: { user: User }) {
  const [relationship, setRelationship] = useState<FamilyRelationship>(() => familyRelationship(user.user_metadata?.family_relationship));
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");
  const busy = useRef(false);

  async function save() {
    if (busy.current) return;
    busy.current = true; setWorking(true); setMessage("");
    try {
      const { error } = await supabase.auth.updateUser({ data: { family_relationship: relationship } });
      if (error) throw error;
      setMessage("Your family label has been saved.");
    } catch {
      setMessage("We could not confirm your family label was saved. Please try again.");
    } finally { busy.current = false; setWorking(false); }
  }

  return <section className="settings-card">
    <p className="eyebrow gold">Your Family Label</p>
    <h2>Parent Or Guardian</h2>
    <p className="muted">Choose how your control badge appears when you use the Family Hub.</p>
    <form className="form-stack" onSubmit={event => { event.preventDefault(); void save(); }}>
      <label>I Am a
        <select value={relationship} disabled={working} onChange={event => setRelationship(familyRelationship(event.target.value))}>
          <option value="parent">Parent</option><option value="guardian">Guardian</option>
        </select>
      </label>
      <button className="primary-button" disabled={working}>{working ? "Saving..." : "Save Family Label"}</button>
      {message && <p role="status">{message}</p>}
    </form>
  </section>;
}
