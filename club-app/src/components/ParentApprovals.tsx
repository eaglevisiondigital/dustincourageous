import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
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

  const load = useCallback(async () => {
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

    if (error) {
      setMessage(error.message);
      return;
    }

    setItems((data ?? []) as PendingProgress[]);
  }, [childIds.join("|")]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const handler = () => void load();
    window.addEventListener("dc-progress-updated", handler);
    return () => window.removeEventListener("dc-progress-updated", handler);
  }, [load]);

  async function unlock(event: FormEvent) {
    event.preventDefault();

    setWorking("unlock");
    setMessage("");

    const { data, error } = await supabase.rpc(
      "create_guardian_unlock_session",
      {
        p_household_id: householdId,
        p_pin: pin
      }
    );

    setWorking("");

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
  }

  function clearExpiredSession(messageText: string) {
    sessionStorage.removeItem("dc_guardian_session_token");
    setGuardianToken("");
    setMessage(messageText);
  }

  async function approve(progressId: string) {
    if (!guardianToken) {
      setMessage("Enter the guardian PIN before approving a challenge.");
      return;
    }

    setWorking("approve:" + progressId);
    setMessage("");

    const { error } = await supabase.rpc(
      "approve_parent_challenge",
      {
        p_progress_id: progressId,
        p_guardian_session_token: guardianToken
      }
    );

    setWorking("");

    if (error) {
      if (/unlock session|expired/i.test(error.message)) {
        clearExpiredSession("Your guardian approval session expired. Enter the PIN again.");
        return;
      }

      setMessage(error.message);
      return;
    }

    setMessage("Challenge approved. XP, badges, streaks, and rewards were updated.");
    await load();
    window.dispatchEvent(new Event("dc-progress-updated"));
  }

  async function returnToChild(progressId: string) {
    if (!guardianToken) {
      setMessage("Enter the guardian PIN before returning a challenge.");
      return;
    }

    setWorking("return:" + progressId);
    setMessage("");

    const { error } = await supabase.rpc(
      "return_parent_challenge",
      {
        p_progress_id: progressId,
        p_guardian_session_token: guardianToken
      }
    );

    setWorking("");

    if (error) {
      if (/unlock session|expired/i.test(error.message)) {
        clearExpiredSession("Your guardian approval session expired. Enter the PIN again.");
        return;
      }

      setMessage(error.message);
      return;
    }

    setMessage("Challenge returned to the child for another look.");
    await load();
    window.dispatchEvent(new Event("dc-progress-updated"));
  }

  const countLabel = useMemo(
    () => items.length + " waiting",
    [items.length]
  );

  if (!items.length) {
    return (
      <section className="parent-approvals-card clear">
        <div>
          <p className="eyebrow gold">Guardian Approvals</p>
          <h2>Nothing waiting right now</h2>
          <p>Challenges that require a parent or guardian will appear here before XP is awarded.</p>
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
        A signed-in guardian session alone is not enough. Approval actions require the household PIN and a short-lived server unlock session.
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
          <button className="secondary-button" disabled={working === "unlock"}>
            {working === "unlock" ? "Checking..." : "Unlock approvals"}
          </button>
        </form>
      )}

      {guardianToken && (
        <div className="guardian-session-chip">
          <span>◆</span>
          <strong>Guardian approval session active</strong>
          <small>Expires automatically</small>
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
                    working === "approve:" + item.id
                  }
                  onClick={() => void approve(item.id)}
                >
                  {working === "approve:" + item.id
                    ? "Approving..."
                    : "Approve"}
                </button>
                <button
                  className="text-button small"
                  disabled={
                    !guardianToken ||
                    working === "return:" + item.id
                  }
                  onClick={() => void returnToChild(item.id)}
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
