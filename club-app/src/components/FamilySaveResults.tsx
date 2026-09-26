import { participationStatusLabel, type ParticipantResult } from "../lib/familyParticipation";
import type { FamilyChild } from "./FamilyParticipants";

export function FamilySaveResults({ results, children }: {
  results: ParticipantResult[]; children: FamilyChild[];
}) {
  if (!results.length) return null;
  return <div className="family-save-results" role="status" aria-live="polite" aria-atomic="true">
    <strong>Confirmed Save</strong>
    <ul>{results.map(result => <li key={result.child_profile_id}>
      <span>{children.find(child => child.id === result.child_profile_id)?.display_name ?? "Child Profile"}</span>
      <span className="status-chip">{participationStatusLabel(result.status)}</span>
    </li>)}</ul>
    <p>This shows the last confirmed save. Current progress appears beside each child above.</p>
  </div>;
}
