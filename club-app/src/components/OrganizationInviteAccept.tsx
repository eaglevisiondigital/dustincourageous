import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { createInvitationAcceptor } from "../lib/invitationAcceptance";

type Preview = {
  invitation_id: string;
  organization_id: string;
  organization_name: string;
  organization_type: string;
  organization_role: string;
  group_id: string | null;
  group_name: string | null;
  group_role: string | null;
  expires_at: string;
};

export function OrganizationInviteAccept({
  invitationId,
  token,
  onAccepted,
  onCancel
}: {
  invitationId: string;
  token: string;
  onAccepted: () => Promise<void>;
  onCancel: () => void;
}) {
  const [preview, setPreview] = useState<Preview | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");
  const [accepted,setAccepted]=useState(false);
  const [retry,setRetry]=useState(0);
  const busy=useRef(false);
  const acceptor=useMemo(()=>createInvitationAcceptor(supabase,"organization",invitationId,token),[invitationId,token]);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);setPreview(null);setMessage("");
      try {
      const { data, error } = await supabase.rpc(
        "preview_organization_invitation",
        {
          p_invitation_id: invitationId,
          p_token: token
        }
      );

      if (!active) return;

      setLoading(false);

      if (error) {
        setMessage(error.message);
        return;
      }

      const row = (data ?? [])[0] as Preview | undefined;
      if (!row) {
        setMessage(
          "This organization invitation is invalid, expired, or belongs to a different email address."
        );
        return;
      }

      setPreview(row);
      } catch {
        if(active)setMessage("The invitation preview could not be loaded. Please try again.");
      } finally {
        if(active)setLoading(false);
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [invitationId, token, retry]);

  async function accept() {
    if(busy.current||loading||(!preview&&!accepted))return;
    busy.current=true;
    setWorking(true);
    setMessage("");

    try {
    await acceptor.accept();
    setAccepted(true);
    setMessage("Invitation accepted. Opening your Leader Hub...");
    await onAccepted();
    } catch(error) {
      setMessage(acceptor.hasAccepted()?"Your invitation was accepted, but the Leader Hub could not open. Try opening it again.":error instanceof Error?error.message:"The invitation could not be accepted. It may have expired or changed. Check with the organization administrator.");
    } finally {busy.current=false;setWorking(false);}
  }

  return (
    <main className="setup-page">
      <div className="setup-card">
        <div className="guardian-lock-icon">◆</div>
        <p className="eyebrow gold">Adventure Club Leader Invitation</p>
        <h1>{loading ? "Checking invitation..." : "Join an approved organization"}</h1>

        {preview && (
          <>
            <div className="organization-invite-preview">
              <span>{preview.organization_type.replaceAll("_", " ")}</span>
              <h2>{preview.organization_name}</h2>
              <p>
                Organization role: <strong>{preview.organization_role}</strong>
              </p>
              {preview.group_name && (
                <p>
                  Group: <strong>{preview.group_name}</strong>
                  {preview.group_role ? " · " + preview.group_role : ""}
                </p>
              )}
              <small>
                Invitation expires {new Date(preview.expires_at).toLocaleString()}.
              </small>
            </div>

            <p className="muted">
              Leader access is separate from family and child profiles. Accepting this invitation does not create a child account or expose family data.
            </p>
          </>
        )}

        {message && <div className="form-message" role="status">{message}</div>}
        {!loading&&!preview&&!accepted&&<button type="button" className="secondary-button" onClick={()=>setRetry(value=>value+1)}>Retry invitation preview</button>}

        {preview && (
          <button
            className="primary-button"
            disabled={working}
            onClick={() => void accept()}
          >
            {working ? "Opening leader access..." : accepted?"Open Leader Hub":"Accept Leader Invitation"}
          </button>
        )}

        <button className="text-button recovery-button" type="button" disabled={working} onClick={onCancel}>
          Return to Adventure Club
        </button>

        <p className="privacy-note">
          You must be signed in with the exact email address the organization administrator invited.
        </p>
      </div>
    </main>
  );
}
