import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabase";

type PendingProgress = {
  id: string;
  child_profile_id: string;
  challenge_id: string;
  submitted_at: string | null;
  child_profiles:
    | { display_name: string }
    | { display_name: string }[]
    | null;
  challenges:
    | {
        title: string;
        challenge_type: string;
        xp_reward: number;
      }
    | {
        title: string;
        challenge_type: string;
        xp_reward: number;
      }[]
    | null;
};

function firstRelation<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

export function ParentApprovals({
  householdId,
  childIds
}: {
  householdId: string;
  childIds: string[];
}) {
  const [items, setItems] = useState<PendingProgress[]>([]);
  const [pin, setPin] = useState("");
  const [guardianToken, setGuardianToken] = useState(
    () => sessionStorage.getItem("dc_guardian_session_token") ?? ""
  );
  const [working, setWorking] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const loadVersion = useRef(0);
  const actionBusy = useRef(false);

  const load = useCallback(async () => {
    const version = ++loadVersion.current;
    setLoading(true);
    setLoadError("");
    try {
    if (!childIds.length) {
      setItems([]);
      return;
    }

    const { data, error } = await supabase
      .from("child_challenge_progress")
      .select(
        "id,child_profile_id,challenge_id,submitted_at,child_profiles(display_name),challenges(title,challenge_type,xp_reward)"
      )
      .in("child_profile_id", childIds)
      .eq("status", "pending_parent")
      .order("submitted_at", { ascending: true });

    if (version !== loadVersion.current) return;
    if (error) throw error;

    setItems((data ?? []) as PendingProgress[]);
    } catch {
      if (version === loadVersion.current) setLoadError("The approval queue could not be loaded. Please try again.");
    } finally {
      if (version === loadVersion.current) setLoading(false);
    }
  }, [householdId, childIds.join("|")]);

  useEffect(() => {
    void load();
    return () => { loadVersion.current += 1; };
  }, [load]);

  useEffect(() => {
    const handler = () => void load();
    window.addEventListener("dc-progress-updated", handler);
    return () => window.removeEventListener("dc-progress-updated", handler);
  }, [load]);

  async function unlock(event: FormEvent) {
    event.preventDefault();
    if (actionBusy.current) return;
    actionBusy.current = true;
    setWorking("unlock");
    setMessage("");
    try {
    const { data, error } = await supabase.rpc(
      "create_guardian_unlock_session",
      {
        p_household_id: householdId,
        p_pin: pin
      }
    );

    if (error || !data) {
      setMessage(error?.message ?? "Guardian PIN was not accepted.");
      setPin("");
      return;
    }

    const token = String(data);
    sessionStorage.setItem("dc_guardian_session_token", token);
    setGuardianToken(token);
    setPin("");
    setMessage("Guardian approval session unlocked for up to 30 minutes.");
    } catch {
      setMessage("The guardian PIN could not be checked. Please try again.");
      setPin("");
    } finally {
      actionBusy.current = false;
      setWorking("");
    }
  }

  function clearExpiredSession(messageText: string) {
    sessionStorage.removeItem("dc_guardian_session_token");
    setGuardianToken("");
    setMessage(messageText);
  }

  async function decide(progressId: string, decision: "approve" | "return") {
    if (actionBusy.current || loading || loadError) return;
    if (!guardianToken) {
      setMessage("Enter the guardian PIN before reviewing a challenge.");
      return;
    }
    actionBusy.current = true;
    setWorking(decision + ":" + progressId);
    setMessage("");
    try {
    const { error } = await supabase.rpc(
      decision === "approve" ? "approve_parent_challenge" : "return_parent_challenge",
      {
        p_progress_id: progressId,
        p_guardian_session_token: guardianToken
      }
    );

    if (error) {
      if (/unlock session|expired/i.test(error.message)) {
        clearExpiredSession("Your guardian approval session expired. Enter the PIN again.");
        return;
      }

      throw error;
    }

    const { data, error: confirmationError } = await supabase.from("child_challenge_progress")
      .select("id,status").eq("id", progressId).single();
    const expectedStatus = decision === "approve" ? "completed" : "in_progress";
    if (confirmationError || data?.status !== expectedStatus) throw new Error("Status not confirmed");
    setMessage(decision === "approve" ? "Challenge approved. Your family's progress is refreshing." : "Challenge returned to the child for another look.");
    } catch {
      setMessage("We could not confirm that action. Check the refreshed queue before trying again.");
    } finally {
      actionBusy.current = false;
      setWorking("");
      window.dispatchEvent(new Event("dc-progress-updated"));
    }
  }

  const countLabel = useMemo(
    () => items.length + " waiting",
    [items.length]
  );

  if (loading) return <section className="parent-approvals-card" aria-busy="true"><p role="status">Loading guardian approvals...</p></section>;
  if (loadError) return <section className="parent-approvals-card"><p role="alert">{loadError}</p>{message && <p>{message}</p>}<button className="secondary-button" onClick={() => void load()}>Try again</button></section>;

  if (!items.length) {
    return (
      <section className="parent-approvals-card clear">
        <div>
          <p className="eyebrow gold">Guardian Approvals</p>
          <h2>Nothing waiting right now</h2>
          <p>Challenges that require a parent or guardian will appear here before XP is awarded.</p>
          {message && <p role="status">{message}</p>}
        </div>
        <span className="status-chip done">All clear</span>
      </section>
    );
  }

  return (
    <section className="parent-approvals-card">
      <div className="section-heading">
        <div>
          <p className="eyebrow red">Guardian Approvals</p>
          <h2>Review completed kid challenges</h2>
        </div>
        <span className="pill">{countLabel}</span>
      </div>

      <p className="muted">
        Enter your guardian PIN to approve a challenge or return it to your child for another look.
      </p>

      {message && <div className="form-message">{message}</div>}

      {!guardianToken && (
        <form className="guardian-approval-unlock" onSubmit={unlock}>
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
              onChange={(event) =>
                setPin(event.target.value.replace(/\D/g, "").slice(0, 6))
              }
            />
          </label>
          <button className="secondary-button" disabled={Boolean(working)}>
            {working === "unlock" ? "Checking..." : "Unlock approvals"}
          </button>
        </form>
      )}

      {guardianToken && (
        <div className="guardian-session-chip">
          <span>◆</span>
          <strong>Guardian PIN entered</strong>
          <small>You may be asked to enter it again when approving.</small>
        </div>
      )}

      <div className="parent-approval-list">
        {items.map((item) => {
          const child = firstRelation(item.child_profiles);
          const challenge = firstRelation(item.challenges);

          return (
            <article key={item.id}>
              <div className="parent-approval-icon">◆</div>
              <div className="parent-approval-copy">
                <span>{challenge?.challenge_type?.replaceAll("_", " ")}</span>
                <h3>{challenge?.title ?? "Adventure Club Challenge"}</h3>
                <p>
                  {child?.display_name ?? "Your child"} says the required steps are finished.
                </p>
                <small>
                  +{challenge?.xp_reward ?? 0} XP after approval
                  {item.submitted_at
                    ? " · submitted " +
                      new Date(item.submitted_at).toLocaleString()
                    : ""}
                </small>
              </div>
              <div className="parent-approval-actions">
                <button
                  className="primary-button compact"
                  disabled={
                    !guardianToken ||
                    Boolean(working)
                  }
                  onClick={() => void decide(item.id, "approve")}
                >
                  {working === "approve:" + item.id
                    ? "Approving..."
                    : "Approve"}
                </button>
                <button
                  className="text-button small"
                  disabled={
                    !guardianToken ||
                    Boolean(working)
                  }
                  onClick={() => void decide(item.id, "return")}
                >
                  Return to child
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
