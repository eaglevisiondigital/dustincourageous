import { useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { createInvitationAcceptor } from "../lib/invitationAcceptance";

export function InviteAccept({
  invitationId,
  token,
  signedInEmail,
  onCancel,
  onAccepted
}: {
  invitationId: string;
  token: string;
  signedInEmail: string;
  onCancel: () => void;
  onAccepted: () => Promise<void>;
}) {
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");
  const [accepted,setAccepted]=useState(false);
  const busy=useRef(false);
  const acceptor=useMemo(()=>createInvitationAcceptor(supabase,"household",invitationId,token),[invitationId,token]);

  async function accept() {
    if(busy.current)return;
    busy.current=true;
    setWorking(true);
    setMessage("");

    try {
    await acceptor.accept();
    setAccepted(true);
    setMessage("Invitation accepted. Opening your Family Hub...");
    await onAccepted();
    } catch(error) {
      setMessage(acceptor.hasAccepted()?"Your invitation was accepted, but the Family Hub could not open. Try opening it again.":error instanceof Error?error.message:"This invitation could not be accepted. Check that it has not expired and that you are signed in with the invited email address.");
    } finally {busy.current=false;setWorking(false);}
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

        <p className="muted">Signed in as {signedInEmail}.</p>
        {message && <div className="form-message" role="status">{message}</div>}

        <button className="primary-button" disabled={working} onClick={() => void accept()}>
          {working ? "Opening family access..." : accepted?"Open Family Hub":"Accept Family Invitation"}
        </button>
        <button className="text-button recovery-button" type="button" disabled={working} onClick={onCancel}>Return to Adventure Club</button>

        <p className="privacy-note">
          You must be signed in with the same email address the invitation was created for.
        </p>
      </div>
    </main>
  );
}
