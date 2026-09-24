import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

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

  useEffect(() => {
    let active = true;

    async function load() {
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
    }

    void load();

    return () => {
      active = false;
    };
  }, [invitationId, token]);

  async function accept() {
    setWorking(true);
    setMessage("");

    const { error } = await supabase.rpc(
      "accept_organization_invitation",
      {
        p_invitation_id: invitationId,
        p_token: token
      }
    );

    setWorking(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Invitation accepted. Opening your Leader Hub...");
    await onAccepted();
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

        {message && <div className="form-message">{message}</div>}

        {preview && (
          <button
            className="primary-button"
            disabled={working}
            onClick={() => void accept()}
          >
            {working ? "Joining..." : "Accept Leader Invitation"}
          </button>
        )}

        <button className="text-button recovery-button" type="button" onClick={onCancel}>
          Return to Adventure Club
        </button>

        <p className="privacy-note">
          You must be signed in with the exact email address the organization administrator invited.
        </p>
      </div>
    </main>
  );
}
