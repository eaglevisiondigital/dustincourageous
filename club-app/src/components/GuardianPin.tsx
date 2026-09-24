import { FormEvent, useState } from "react";
import { supabase } from "../lib/supabase";

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
        <p className="eyebrow red">Family Protection</p>
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
  onUnlock: () => void;
  onClose: () => void;
  onSignOut: () => Promise<void>;
}) {
  const [pin, setPin] = useState("");
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setWorking(true);
    setMessage("");

    const { data, error } = await supabase.rpc("verify_guardian_pin", {
      p_household_id: householdId,
      p_pin: pin
    });

    setWorking(false);

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
    onUnlock();
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="guardian-unlock-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="guardian-unlock-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className="modal-close" type="button" onClick={onClose} aria-label="Close">
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
          {message && <div className="form-message">{message}</div>}
          <button className="primary-button" disabled={working}>
            {working ? "Checking..." : "Unlock Family Hub"}
          </button>
        </form>

        <button className="text-button recovery-button" type="button" onClick={() => void onSignOut()}>
          Forgot the PIN? Sign out and sign back in as the guardian
        </button>
      </section>
    </div>
  );
}
