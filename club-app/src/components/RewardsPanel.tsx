import { requestUnlockedReward, rewardStatusLabel } from "../lib/rewardRequests";
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
  const [message, setMessage] = useState("");
  const [loaded, setLoaded] = useState(false);
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

    if (!nextUnlocks.length) {
      setUnlocks([]); setLoaded(true); setRedemptions({});
      return;
    }

    const { data: redemptionData, error: redemptionError } = await supabase
      .from("reward_redemptions")
      .select("reward_unlock_id,status")
      .in("reward_unlock_id", nextUnlocks.map((item) => item.id));

    if (version !== loadVersion.current) return;
    if (redemptionError) throw redemptionError;
    setUnlocks(nextUnlocks); setLoaded(true);
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
    const refresh = () => { if (!requestBusy.current) void load(); };
    window.addEventListener("dc-progress-updated", refresh);
    return () => {
      loadVersion.current += 1;
      window.removeEventListener("dc-progress-updated", refresh);
    };
  }, [load]);

  async function requestReward(unlockId: string) {
    if (requestBusy.current || loading || loadError || redemptions[unlockId]) return;
    const unlock = unlocks.find(item => item.id === unlockId);
    if (!unlock || unlock.redeemed_at || !unlock.rewards || (Array.isArray(unlock.rewards) && !unlock.rewards.length)) return;
    requestBusy.current = true;
    setWorkingId(unlockId);
    setError(""); setMessage("");
    try {
    await requestUnlockedReward(supabase, unlockId, userId);
    setMessage("Reward requested. You can follow its status here.");

    } catch {
      setError("We could not confirm the request. Check the refreshed reward status before trying again.");
    } finally {
      await load();
      requestBusy.current = false;
      setWorkingId(null);
    }
  }

  if (loading && !loaded) return <section className="family-section-card" aria-busy="true"><p role="status">Loading rewards...</p></section>;
  if (loadError && !loaded) return <section className="family-section-card"><p role="alert">{loadError}</p>{error && <p>{error}</p>}<button className="secondary-button" onClick={() => void load()}>Try Again</button></section>;

  if (!unlocks.length && !loading && !loadError) {
    return (
      <section className="family-section-card">
        <div className="section-heading compact-heading">
          <div>
            <p className="eyebrow gold">Rewards</p>
            <h2>Unlocked Rewards</h2>
          </div>
        </div>
        <p className="muted">Rewards earned through Adventure Club progress will appear here for guardian review.</p>
        {error && <p role="alert">{error}</p>}
        {message && <p role="status">{message}</p>}
        <button type="button" className="text-button" onClick={() => void load()}>Refresh Rewards</button>
      </section>
    );
  }

  return (
    <section className="family-section-card">
      <div className="section-heading compact-heading">
        <div>
          <p className="eyebrow gold">Rewards</p>
          <h2>Unlocked Rewards</h2>
        </div>
      </div>

      <button type="button" className="text-button" disabled={loading || workingId !== null} onClick={() => void load()}>Refresh Rewards</button>
      {loading && <p role="status">Refreshing rewards...</p>}
      {loadError && <p role="alert">{loadError} Displayed rewards may be out of date.</p>}
      {message && <p role="status">{message}</p>}
      {error && <div className="form-message" role="alert">{error}</div>}

      <div className="reward-list">
        {unlocks.map((unlock) => {
          const reward = Array.isArray(unlock.rewards) ? unlock.rewards[0] : unlock.rewards;
          const redemption = redemptions[unlock.id];

          return (
            <article className="reward-row" key={unlock.id}>
              <div className="reward-icon">★</div>
              <div>
                <strong>{reward?.name || "Reward Unavailable"}</strong>
                <p>{reward?.description || "A reward earned through courageous progress."}</p>
              </div>
              <div className="reward-action">
                {unlock.redeemed_at ? (
                  <span className="status-chip done">Fulfilled</span>
                ) : redemption ? (
                  <span className="status-chip">{rewardStatusLabel(redemption)}</span>
                ) : (
                  <button
                    className="secondary-button"
                    type="button"
                    disabled={workingId !== null || loading || Boolean(loadError) || !reward}
                    onClick={() => void requestReward(unlock.id)}
                  >
                    {workingId === unlock.id ? "Requesting..." : "Request Reward"}
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
