export type FamilyChild = { id: string; display_name: string };
export function FamilyParticipants({ children, selected, onChange, disabled = false, statuses = {} }: {
  children: FamilyChild[]; selected: string[]; onChange: (ids: string[]) => void;
  disabled?: boolean; statuses?: Record<string, string>;
}) {
  return <fieldset className="family-participants" disabled={disabled}>
    <legend>Who Took Part?</legend>
    <p>Check only the children who participated. Credit is saved separately for each selected child.</p>
    <div className="participant-actions">
      <button type="button" className="text-button" onClick={() => onChange(children.map(child => child.id))}>Select All</button>
      <button type="button" className="text-button" onClick={() => onChange([])}>Clear Selection</button>
    </div>
    <p className="muted" role="status">{children.filter(child => selected.includes(child.id)).length} {children.filter(child => selected.includes(child.id)).length === 1 ? "Child Selected" : "Children Selected"}</p>
    <div className="participant-grid">{children.map(child => <label key={child.id} className={selected.includes(child.id) ? "participant-choice selected" : "participant-choice"}>
      <input type="checkbox" checked={selected.includes(child.id)} onChange={event => onChange(event.target.checked ? [...selected, child.id] : selected.filter(id => id !== child.id))}/>
      <span>{child.display_name}</span>
      {statuses[child.id] && <small>{statuses[child.id]}</small>}
    </label>)}</div>
    {!children.length && <p>Add a child profile in Family Hub to record participation.</p>}
  </fieldset>;
}
