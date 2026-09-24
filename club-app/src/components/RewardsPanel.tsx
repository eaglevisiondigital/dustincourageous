import { useCallback, useEffect, useState } from "react";
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

  const load = useCallback(async () => {
    setError("");

    const { data, error: unlockError } = await supabase
      .from("reward_unlocks")
      .select("id,unlocked_at,redeemed_at,rewards(id,name,description,reward_type)")
      .eq("child_profile_id", childId)
      .order("unlocked_at", { ascending: false });

    if (unlockError) {
      setError(unlockError.message);
      return;
    }

    const nextUnlocks = (data ?? []) as Unlock[];
    setUnlocks(nextUnlocks);

    if (!nextUnlocks.length) {
      setRedemptions({});
      return;
    }

    const { data: redemptionData } = await supabase
      .from("reward_redemptions")
      .select("reward_unlock_id,status")
      .in("reward_unlock_id", nextUnlocks.map((item) => item.id));

    setRedemptions(
      Object.fromEntries(
        ((redemptionData ?? []) as Redemption[]).map((item) => [
          item.reward_unlock_id,
          item.status
        ])
      )
    );
  }, [childId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function requestReward(unlockId: string) {
    setWorkingId(unlockId);
    setError("");

    const { error: requestError } = await supabase.from("reward_redemptions").insert({
      reward_unlock_id: unlockId,
      requested_by: userId,
      status: "requested"
    });

    setWorkingId(null);

    if (requestError) {
      setError(requestError.message);
      return;
    }

    await load();
  }

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
                    disabled={workingId === unlock.id}
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
