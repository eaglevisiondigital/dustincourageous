import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

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
  onClose,
  onCompleted
}: {
  challenge: Challenge;
  childId: string;
  onClose: () => void;
  onCompleted: () => Promise<void>;
}) {
  const [steps, setSteps] = useState<Step[]>([]);
  const [progressId, setProgressId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("not_started");
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");

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

      if (stepsResult.error) {
        setError(stepsResult.error.message);
        setLoading(false);
        return;
      }

      setSteps((stepsResult.data ?? []) as Step[]);

      if (progressResult.error) {
        setError(progressResult.error.message);
        setLoading(false);
        return;
      }

      if (progressResult.data) {
        setProgressId(progressResult.data.id);
        setStatus(progressResult.data.status);

        const stepProgress = await supabase
          .from("child_step_progress")
          .select("challenge_step_id,completed")
          .eq("child_challenge_progress_id", progressResult.data.id)
          .eq("completed", true);

        if (!cancelled && !stepProgress.error) {
          setCompletedSteps(
            new Set((stepProgress.data ?? []).map((item) => item.challenge_step_id))
          );
        }
      }

      if (!cancelled) setLoading(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [challenge.id, childId]);

  async function startChallenge() {
    setWorking(true);
    setError("");

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

    setWorking(false);

    if (startError) {
      setError(startError.message);
      return;
    }

    setProgressId(data.id);
    setStatus(data.status);
  }

  async function toggleStep(stepId: string) {
    if (!progressId || status === "completed" || status === "pending_parent") return;

    const nextCompleted = !completedSteps.has(stepId);
    setWorking(true);
    setError("");

    const { error: stepError } = await supabase
      .from("child_step_progress")
      .upsert(
        {
          child_challenge_progress_id: progressId,
          challenge_step_id: stepId,
          completed: nextCompleted,
          completed_at: nextCompleted ? new Date().toISOString() : null
        },
        { onConflict: "child_challenge_progress_id,challenge_step_id" }
      );

    setWorking(false);

    if (stepError) {
      setError(stepError.message);
      return;
    }

    setCompletedSteps((current) => {
      const next = new Set(current);
      if (nextCompleted) next.add(stepId);
      else next.delete(stepId);
      return next;
    });
  }

  async function completeChallenge() {
    if (!progressId || status === "completed") return;

    const requiredIncomplete = steps.some(
      (step) => step.is_required && !completedSteps.has(step.id)
    );

    if (requiredIncomplete) {
      setError("Finish the required steps before completing this challenge.");
      return;
    }

    setWorking(true);
    setError("");

    const nextStatus = challenge.parent_approval_required
      ? "pending_parent"
      : "completed";

    const { error: completeError } = await supabase
      .from("child_challenge_progress")
      .update({
        status: nextStatus,
        submitted_at: new Date().toISOString()
      })
      .eq("id", progressId);

    setWorking(false);

    if (completeError) {
      setError(completeError.message);
      return;
    }

    setStatus(nextStatus);
    await onCompleted();
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="challenge-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="challenge-dialog-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className="modal-close" type="button" onClick={onClose} aria-label="Close challenge">
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

        {loading ? (
          <div className="dialog-loading"><div className="loader" /> Loading challenge...</div>
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

            {error && <div className="form-message">{error}</div>}

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
      </section>
    </div>
  );
}
