import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { saveChallengeCompletion } from "../lib/challengeProgress";
import { FamilyChallengeActivity } from "./FamilyChallengeActivity";
import { ModalDialog } from "./ModalDialog";

type Challenge = {
  id: string;
  title: string;
  description: string | null;
  challenge_type: string;
  xp_reward: number;
  access_level: string;
  parent_approval_required: boolean;
};

type Step = {
  id: string;
  title: string;
  instructions: string | null;
  is_required: boolean;
  sort_order: number;
};

export function ChallengeDialog({
  challenge,
  childId,
  family,
  onClose,
  onCompleted
}: {
  challenge: Challenge;
  childId: string;
  family?: {householdId:string;children:{id:string;display_name:string}[]};
  onClose: () => void;
  onCompleted: () => Promise<void>;
}) {
  const [familyMode,setFamilyMode] = useState(false);
  const [steps, setSteps] = useState<Step[]>([]);
  const [progressId, setProgressId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("not_started");
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [loadFailed, setLoadFailed] = useState(false);
  const [reloadCount, setReloadCount] = useState(0);
  const mutationBusy = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");
      setLoadFailed(false);
      setSteps([]);
      setProgressId(null);
      setStatus("not_started");
      setCompletedSteps(new Set());

      try {
      const [stepsResult, progressResult] = await Promise.all([
        supabase
          .from("challenge_steps")
          .select("id,title,instructions,is_required,sort_order")
          .eq("challenge_id", challenge.id)
          .order("sort_order", { ascending: true }),
        supabase
          .from("child_challenge_progress")
          .select("id,status")
          .eq("child_profile_id", childId)
          .eq("challenge_id", challenge.id)
          .maybeSingle()
      ]);

      if (cancelled) return;

      if (stepsResult.error) throw stepsResult.error;

      setSteps((stepsResult.data ?? []) as Step[]);

      if (progressResult.error) throw progressResult.error;

      if (progressResult.data) {
        setProgressId(progressResult.data.id);
        setStatus(progressResult.data.status);

        const stepProgress = await supabase
          .from("child_step_progress")
          .select("challenge_step_id,completed")
          .eq("child_challenge_progress_id", progressResult.data.id)
          .eq("completed", true);

        if (stepProgress.error) throw stepProgress.error;
        if (!cancelled) {
          setCompletedSteps(
            new Set((stepProgress.data ?? []).map((item) => item.challenge_step_id))
          );
        }
      }

      if (!cancelled && reloadCount > 0) {
        void onCompleted().catch(() => {});
      }
      } catch {
        if (!cancelled) {
          setLoadFailed(true);
          setError("Your challenge progress could not be loaded. Please try again.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [challenge.id, childId, reloadCount]);

  async function save(action: () => Promise<void>) {
    if (mutationBusy.current || loading || loadFailed) return;
    mutationBusy.current = true;
    setWorking(true);
    setError("");
    try {
      await action();
    } catch {
      setLoadFailed(true);
      setError("We could not confirm your save. Reload your progress before trying again.");
    } finally {
      mutationBusy.current = false;
      setWorking(false);
    }
  }

  async function startChallenge() {
    if (progressId || status !== "not_started") return;
    await save(async () => {

    const { data, error: startError } = await supabase
      .from("child_challenge_progress")
      .insert({
        child_profile_id: childId,
        challenge_id: challenge.id,
        status: "in_progress",
        started_at: new Date().toISOString()
      })
      .select("id,status")
      .single();

    if (startError) throw startError;
    if (!data) throw new Error("Missing saved progress");

    setProgressId(data.id);
    setStatus(data.status);
    });
  }

  async function toggleStep(stepId: string) {
    if (!progressId || status === "completed" || status === "pending_parent") return;

    const nextCompleted = !completedSteps.has(stepId);
    await save(async () => {

    const { data, error: stepError } = await supabase
      .from("child_step_progress")
      .upsert(
        {
          child_challenge_progress_id: progressId,
          challenge_step_id: stepId,
          completed: nextCompleted,
          completed_at: nextCompleted ? new Date().toISOString() : null
        },
        { onConflict: "child_challenge_progress_id,challenge_step_id" }
      ).select("challenge_step_id,completed").single();
    if (stepError) throw stepError;
    if (!data || data.challenge_step_id !== stepId || data.completed !== nextCompleted) throw new Error("Step save not confirmed");

    setCompletedSteps((current) => {
      const next = new Set(current);
      if (nextCompleted) next.add(stepId);
      else next.delete(stepId);
      return next;
    });
    });
  }

  async function completeChallenge() {
    if (!progressId || status === "completed" || status === "pending_parent") return;

    const requiredIncomplete = steps.some(
      (step) => step.is_required && !completedSteps.has(step.id)
    );

    if (requiredIncomplete) {
      setError("Finish the required steps before completing this challenge.");
      return;
    }

    await save(async () => {
    const nextStatus = challenge.parent_approval_required
      ? "pending_parent"
      : "completed";

    const saved = await saveChallengeCompletion(supabase, progressId, childId, status, nextStatus);
    setStatus(saved.status);
    try { await onCompleted(); } catch {
      setError("Your challenge was saved. Reopen your adventure to refresh the progress display.");
    }
    });
  }

  if (familyMode && family) return <ModalDialog className="challenge-dialog" labelledBy="family-challenge-title" busy={working} onClose={onClose}>
    <h2 id="family-challenge-title">Family Challenge</h2>
    <button type="button" className="modal-close" disabled={working} onClick={onClose} aria-label="Close family challenge">×</button>
    <FamilyChallengeActivity householdId={family.householdId} children={family.children} challengeId={challenge.id} onSaved={onCompleted} onBusyChange={setWorking}/>
  </ModalDialog>;

  return (
      <ModalDialog
        className="challenge-dialog"
        labelledBy="challenge-dialog-title"
        busy={working}
        onClose={() => { if (!mutationBusy.current) onClose(); }}
      >
        <button className="modal-close" type="button" disabled={working} onClick={onClose} aria-label="Close challenge">
          ×
        </button>

        <div className="challenge-dialog-head">
          <div>
            <p className="eyebrow red">{challenge.challenge_type.replaceAll("_", " ")}</p>
            <h2 id="challenge-dialog-title">{challenge.title}</h2>
            <p>{challenge.description || "Take on this challenge and keep growing in courage."}</p>
          </div>
          <span className="xp-chip large">+{challenge.xp_reward} XP</span>
        </div>

        {family && <button type="button" className="secondary-button" disabled={working} onClick={()=>setFamilyMode(true)}>Do This As A Family</button>}

        {loading ? (
          <div className="dialog-loading"><div className="loader" /> Loading challenge...</div>
        ) : loadFailed ? (
          <div className="empty-state"><p role="alert">{error}</p><button className="secondary-button" onClick={() => setReloadCount(value => value + 1)}>Reload Progress</button></div>
        ) : (
          <>
            {steps.length > 0 && (
              <div className="challenge-steps">
                {steps.map((step, index) => {
                  const checked = completedSteps.has(step.id);
                  return (
                    <button
                      type="button"
                      className={checked ? "step-row complete" : "step-row"}
                      key={step.id}
                      disabled={!progressId || status === "completed" || status === "pending_parent" || working}
                      onClick={() => void toggleStep(step.id)}
                    >
                      <span className="step-check">{checked ? "✓" : index + 1}</span>
                      <span>
                        <strong>{step.title}</strong>
                        {step.instructions && <small>{step.instructions}</small>}
                        {step.is_required && <em>Required</em>}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {challenge.parent_approval_required && (
              <div className="guardian-note">
                When you finish the required steps, this challenge goes to your parent or guardian for approval before XP is awarded.
              </div>
            )}

            {error && <div className="form-message" role="alert">{error}</div>}

            <div className="dialog-actions">
              {status === "not_started" && !progressId ? (
                <button className="primary-button" type="button" disabled={working} onClick={() => void startChallenge()}>
                  {working ? "Starting..." : "Start challenge"}
                </button>
              ) : status === "completed" ? (
                <div className="success-banner">
                  <strong>Challenge complete!</strong>
                  <span>Your progress and rewards have been updated.</span>
                </div>
              ) : status === "pending_parent" ? (
                <div className="success-banner pending">
                  <strong>Sent to your guardian!</strong>
                  <span>Your required steps are finished. XP will be awarded after guardian approval.</span>
                </div>
              ) : (
                <button className="primary-button" type="button" disabled={working} onClick={() => void completeChallenge()}>
                  {working
                    ? challenge.parent_approval_required
                      ? "Submitting..."
                      : "Completing..."
                    : challenge.parent_approval_required
                      ? "Submit to guardian"
                      : "Complete challenge"}
                </button>
              )}
            </div>
          </>
        )}
      </ModalDialog>
  );
}
