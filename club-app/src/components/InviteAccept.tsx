import { useState } from "react";
import { supabase } from "../lib/supabase";

export function InviteAccept({
  invitationId,
  token,
  onAccepted
}: {
  invitationId: string;
  token: string;
  onAccepted: () => Promise<void>;
}) {
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");

  async function accept() {
    setWorking(true);
    setMessage("");

    const { error } = await supabase.rpc("accept_household_invitation", {
      p_invitation_id: invitationId,
      p_token: token
    });

    setWorking(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Invitation accepted. Opening your Family Hub...");
    await onAccepted();
  }

  return (
    <main className="setup-page">
      <div className="setup-card">
        <div className="guardian-lock-icon">◆</div>
        <p className="eyebrow gold">Family Invitation</p>
        <h1>Join this Dustin Courageous family</h1>
        <p className="muted">
          This invitation adds your own adult login to an existing Family Hub. You will not share another guardian's password.
        </p>

        {message && <div className="form-message">{message}</div>}

        <button className="primary-button" disabled={working} onClick={() => void accept()}>
          {working ? "Joining..." : "Accept Family Invitation"}
        </button>

        <p className="privacy-note">
          You must be signed in with the same email address the invitation was created for.
        </p>
      </div>
    </main>
  );
}
