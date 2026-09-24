import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";

type Unlock = {
  id: string;
  unlocked_at: string;
  redeemed_at: string | null;
  rewards:
    | {
        id: string;
        name: string;
        description: string | null;
        reward_type: string;
      }
    | {
        id: string;
        name: string;
        description: string | null;
        reward_type: string;
      }[]
    | null;
};

type Redemption = {
  reward_unlock_id: string;
  status: string;
};

export function RewardsPanel({ childId, userId }: { childId: string; userId: string }) {
  const [unlocks, setUnlocks] = useState<Unlock[]>([]);
  const [redemptions, setRedemptions] = useState<Record<string, string>>({});
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const loadVersion = useRef(0);
  const requestBusy = useRef(false);

  const load = useCallback(async () => {
    const version = ++loadVersion.current;
    setLoading(true);
    setLoadError("");
    try {

    const { data, error: unlockError } = await supabase
      .from("reward_unlocks")
      .select("id,unlocked_at,redeemed_at,rewards(id,name,description,reward_type)")
      .eq("child_profile_id", childId)
      .order("unlocked_at", { ascending: false });

    if (version !== loadVersion.current) return;
    if (unlockError) throw unlockError;

    const nextUnlocks = (data ?? []) as Unlock[];
    setUnlocks(nextUnlocks);

    if (!nextUnlocks.length) {
      setRedemptions({});
      return;
    }

    const { data: redemptionData, error: redemptionError } = await supabase
      .from("reward_redemptions")
      .select("reward_unlock_id,status")
      .in("reward_unlock_id", nextUnlocks.map((item) => item.id));

    if (version !== loadVersion.current) return;
    if (redemptionError) throw redemptionError;
    setRedemptions(
      Object.fromEntries(
        ((redemptionData ?? []) as Redemption[]).map((item) => [
          item.reward_unlock_id,
          item.status
        ])
      )
    );
    } catch {
      if (version === loadVersion.current) setLoadError("Rewards could not be loaded. Please try again.");
    } finally {
      if (version === loadVersion.current) setLoading(false);
    }
  }, [childId]);

  useEffect(() => {
    void load();
    const refresh = () => void load();
    window.addEventListener("dc-progress-updated", refresh);
    return () => {
      loadVersion.current += 1;
      window.removeEventListener("dc-progress-updated", refresh);
    };
  }, [load]);

  async function requestReward(unlockId: string) {
    if (requestBusy.current || loading || loadError || redemptions[unlockId]) return;
    requestBusy.current = true;
    setWorkingId(unlockId);
    setError("");
    try {
    const { data, error: requestError } = await supabase.from("reward_redemptions").insert({
      reward_unlock_id: unlockId,
      requested_by: userId,
      status: "requested"
    }).select("reward_unlock_id,status").single();
    if (requestError) throw requestError;
    if (data?.reward_unlock_id !== unlockId) throw new Error("Request not confirmed");
    } catch {
      setError("We could not confirm the request. Check the refreshed reward status before trying again.");
    } finally {
      await load();
      requestBusy.current = false;
      setWorkingId(null);
    }
  }

  if (loading) return <section className="family-section-card" aria-busy="true"><p role="status">Loading rewards...</p></section>;
  if (loadError) return <section className="family-section-card"><p role="alert">{loadError}</p>{error && <p>{error}</p>}<button className="secondary-button" onClick={() => void load()}>Try again</button></section>;

  if (!unlocks.length) {
    return (
      <section className="family-section-card">
        <div className="section-heading compact-heading">
          <div>
            <p className="eyebrow gold">Rewards</p>
            <h2>Unlocked rewards</h2>
          </div>
        </div>
        <p className="muted">Rewards earned through Adventure Club progress will appear here for guardian review.</p>
        {error && <p role="alert">{error}</p>}
      </section>
    );
  }

  return (
    <section className="family-section-card">
      <div className="section-heading compact-heading">
        <div>
          <p className="eyebrow gold">Rewards</p>
          <h2>Unlocked rewards</h2>
        </div>
      </div>

      {error && <div className="form-message">{error}</div>}

      <div className="reward-list">
        {unlocks.map((unlock) => {
          const reward = Array.isArray(unlock.rewards) ? unlock.rewards[0] : unlock.rewards;
          const redemption = redemptions[unlock.id];

          return (
            <article className="reward-row" key={unlock.id}>
              <div className="reward-icon">★</div>
              <div>
                <strong>{reward?.name || "Adventure Club reward"}</strong>
                <p>{reward?.description || "A reward earned through courageous progress."}</p>
              </div>
              <div className="reward-action">
                {unlock.redeemed_at ? (
                  <span className="status-chip done">Fulfilled</span>
                ) : redemption ? (
                  <span className="status-chip">{redemption.replaceAll("_", " ")}</span>
                ) : (
                  <button
                    className="secondary-button"
                    type="button"
                    disabled={workingId !== null}
                    onClick={() => void requestReward(unlock.id)}
                  >
                    {workingId === unlock.id ? "Requesting..." : "Request reward"}
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
