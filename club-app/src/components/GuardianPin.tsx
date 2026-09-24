import { FormEvent, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { ModalDialog } from "./ModalDialog";

export function GuardianPinSetup({
  householdId,
  onComplete
}: {
  householdId: string;
  onComplete: () => void;
}) {
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setMessage("");

    if (!/^\d{4,6}$/.test(pin)) {
      setMessage("Choose a 4 to 6 digit guardian PIN.");
      return;
    }

    if (pin !== confirmPin) {
      setMessage("The PINs do not match.");
      return;
    }

    setWorking(true);
    const { error } = await supabase.rpc("set_guardian_pin", {
      p_household_id: householdId,
      p_pin: pin
    });
    setWorking(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setPin("");
    setConfirmPin("");
    onComplete();
  }

  return (
    <main className="setup-page">
      <div className="setup-card">
        <div className="guardian-lock-icon">◆</div>
        <p className="eyebrow red">Step 3 of 3 · Family Protection</p>
        <h1>Create your guardian PIN</h1>
        <p className="muted">
          When you hand the Adventure Club to a child, this PIN unlocks the Family Hub,
          rewards, account settings, and admin controls.
        </p>

        <form className="form-stack" onSubmit={submit}>
          <label>
            Guardian PIN
            <input
              required
              type="password"
              inputMode="numeric"
              autoComplete="off"
              minLength={4}
              maxLength={6}
              pattern="[0-9]*"
              value={pin}
              onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 6))}
            />
          </label>
          <label>
            Confirm PIN
            <input
              required
              type="password"
              inputMode="numeric"
              autoComplete="off"
              minLength={4}
              maxLength={6}
              pattern="[0-9]*"
              value={confirmPin}
              onChange={(event) => setConfirmPin(event.target.value.replace(/\D/g, "").slice(0, 6))}
            />
          </label>
          {message && <div className="form-message">{message}</div>}
          <button className="primary-button" disabled={working}>
            {working ? "Securing..." : "Set guardian PIN"}
          </button>
        </form>

        <p className="privacy-note">
          Your PIN is converted to a secure one-way hash before storage. The original PIN is not stored.
        </p>
      </div>
    </main>
  );
}

export function GuardianUnlockDialog({
  householdId,
  onUnlock,
  onClose,
  onSignOut
}: {
  householdId: string;
  onUnlock: (token: string) => void;
  onClose: () => void;
  onSignOut: () => Promise<void>;
}) {
  const [pin, setPin] = useState("");
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");
  const busyRef = useRef(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busyRef.current) return;
    busyRef.current = true;
    setWorking(true);
    setMessage("");
    try {
    const { data, error } = await supabase.rpc("create_guardian_unlock_session", {
      p_household_id: householdId,
      p_pin: pin
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    if (!data) {
      setMessage("That PIN was not accepted. After repeated attempts, the guardian lock temporarily pauses PIN entry.");
      setPin("");
      return;
    }

    setPin("");
    onUnlock(String(data));
    } catch {
      setMessage("We could not check your guardian PIN. Please try again.");
      setPin("");
    } finally {
      busyRef.current = false;
      setWorking(false);
    }
  }

  async function recover() {
    if (busyRef.current) return;
    busyRef.current = true;
    setWorking(true);
    setMessage("");
    try { await onSignOut(); } catch {
      setMessage("Sign-out could not be completed. Please try again.");
    } finally {
      busyRef.current = false;
      setWorking(false);
    }
  }

  return (
      <ModalDialog
        className="guardian-unlock-dialog"
        labelledBy="guardian-unlock-title"
        busy={working}
        onClose={() => { if (!busyRef.current) onClose(); }}
      >
        <button className="modal-close" type="button" disabled={working} onClick={onClose} aria-label="Close">
          ×
        </button>
        <div className="guardian-lock-icon small">◆</div>
        <p className="eyebrow red">Guardian Only</p>
        <h2 id="guardian-unlock-title">Unlock Family Hub</h2>
        <p className="muted">Enter the guardian PIN to leave locked Kid View.</p>

        <form className="form-stack" onSubmit={submit}>
          <label>
            Guardian PIN
            <input
              autoFocus
              required
              type="password"
              inputMode="numeric"
              autoComplete="off"
              minLength={4}
              maxLength={6}
              pattern="[0-9]*"
              value={pin}
              onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 6))}
            />
          </label>
          {message && <div className="form-message" role="alert">{message}</div>}
          <button className="primary-button" disabled={working}>
            {working ? "Checking..." : "Unlock Family Hub"}
          </button>
        </form>

        <button className="text-button recovery-button" type="button" disabled={working} onClick={() => void recover()}>
          Forgot the PIN? Sign out and sign back in as the guardian
        </button>
      </ModalDialog>
  );
}
