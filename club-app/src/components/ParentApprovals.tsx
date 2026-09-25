import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabase";

import { readParentApprovals, confirmParentDecision, approvalRelation as firstRelation, type PendingApproval as PendingProgress } from "../lib/parentApprovals";

export function ParentApprovals({
  householdId,
  childIds
}: {
  householdId: string;
  childIds: string[];
}) {
  const [items, setItems] = useState<PendingProgress[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loaded, setLoaded] = useState(false);
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
    const result = await readParentApprovals(supabase, householdId, childIds);
    if (version !== loadVersion.current) return;
    setItems(result.items); setHasMore(result.hasMore); setLoaded(true);

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
    const handler = () => { if (!actionBusy.current) void load(); };
    window.addEventListener("dc-progress-updated", handler);
    return () => window.removeEventListener("dc-progress-updated", handler);
  }, [load]);

  async function unlock(event: FormEvent) {
    event.preventDefault();
    if (actionBusy.current || loading || loadError) return;
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
      await load();
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
    const item = items.find(row => row.id === progressId && childIds.includes(row.child_profile_id));
    if (!item) return;
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

    await confirmParentDecision(supabase, progressId, item.child_profile_id, decision);
    setMessage(decision === "approve" ? "Challenge approved. Your family's progress is refreshing." : "Challenge returned to the child for another look.");
    } catch {
      setMessage("We could not confirm that action. Check the refreshed queue before trying again.");
    } finally {
      window.dispatchEvent(new Event("dc-progress-updated"));
      await load();
      actionBusy.current = false;
      setWorking("");
    }
  }

  const countLabel = useMemo(
    () => items.length + (hasMore ? "+ Waiting" : " Waiting"),
    [items.length, hasMore]
  );

  if (loading && !loaded) return <section className="parent-approvals-card" aria-busy="true"><p role="status">Loading guardian approvals...</p></section>;
  if (loadError && !loaded) return <section className="parent-approvals-card"><p role="alert">{loadError}</p>{message && <p>{message}</p>}<button className="secondary-button" onClick={() => void load()}>Try Again</button></section>;

  if (!items.length && !loading && !loadError) {
    return (
      <section className="parent-approvals-card clear">
        <div>
          <p className="eyebrow gold">Guardian Approvals</p>
          <h2>Nothing waiting right now</h2>
          <p>Challenges that require a parent or guardian will appear here before XP is awarded.</p>
          {message && <p role="status">{message}</p>}
        </div>
        <div className="family-action-buttons"><span className="status-chip done">All Clear</span><button type="button" className="text-button" onClick={() => void load()}>Refresh Approvals</button></div>
      </section>
    );
  }

  return (
    <section className="parent-approvals-card">
      <div className="section-heading">
        <div>
          <p className="eyebrow red">Guardian Approvals</p>
          <h2>Review challenge completions</h2>
        </div>
        <span className="pill">{countLabel}</span>
      </div>

      <div className="family-action-buttons">
        <button type="button" className="text-button" disabled={Boolean(working) || loading} onClick={() => void load()}>Refresh Approvals</button>
      </div>
      {loading && <p role="status">Refreshing approval progress...</p>}
      {loadError && <p role="alert">{loadError} Displayed approvals may be out of date.</p>}
      {hasMore && <p className="muted">Showing the first 50 waiting approvals. Reviewing these brings the next items into the queue.</p>}
      <p className="muted">
        Enter your guardian PIN to approve a challenge or return it to your child for another look.
      </p>

      {message && <div className="form-message" role="status">{message}</div>}

      {!guardianToken && (
        <form className="guardian-approval-unlock" onSubmit={unlock}>
          <label>
            Guardian PIN
            <input
              required
              disabled={Boolean(working) || loading || Boolean(loadError)}
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
          <button className="secondary-button" disabled={Boolean(working) || loading || Boolean(loadError)}>
            {working === "unlock" ? "Checking..." : "Unlock Approvals"}
          </button>
        </form>
      )}

      {guardianToken && (
        <div className="guardian-session-chip">
          <span aria-hidden="true">◆</span>
          <strong>Guardian PIN Entered</strong>
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
                    Boolean(working) || loading || Boolean(loadError)
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
                    Boolean(working) || loading || Boolean(loadError)
                  }
                  onClick={() => void decide(item.id, "return")}
                >
                  Return To Child
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
