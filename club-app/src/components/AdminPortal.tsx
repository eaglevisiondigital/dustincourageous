import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { WeeklySeriesAdmin } from "./WeeklySeriesAdmin";
import { FaithContentAdmin } from "./FaithContentAdmin";
import { BookAdmin } from "./BookAdmin";
import { MediaAdmin } from "./MediaAdmin";
import { ContentAdmin } from "./ContentAdmin";
import { FamilyFaithAdmin } from "./FamilyFaithAdmin";

type ChallengeRow = {
  id: string;
  title: string;
  slug: string;
  challenge_type: string;
  status: string;
  access_level: string;
  xp_reward: number;
  parent_approval_required: boolean;
  created_at: string;
};

type BadgeRow = {
  id: string;
  badge_key: string;
  name: string;
  description: string | null;
  rarity: string;
  badge_scope: string;
  badge_tier: string | null;
  badge_family_key: string | null;
  is_active: boolean;
  badge_rules:
    | {
        id: string;
        rule_type: string;
        threshold_value: number | null;
        streak_key: string | null;
        challenge_type: string | null;
        token_type: string | null;
        activity_event_type: string | null;
        is_active: boolean;
      }[]
    | null;
};

type RewardRow = {
  id: string;
  reward_key: string;
  name: string;
  description: string | null;
  reward_type: string;
  xp_required: number | null;
  access_level: string;
  inventory_quantity: number | null;
  is_active: boolean;
};

type RedemptionRow = {
  id: string;
  status: string;
  requested_at: string;
  fulfillment_reference: string | null;
  reward_unlocks:
    | {
        id: string;
        child_profile_id: string;
        rewards:
          | {
              name: string;
              reward_type: string;
            }
          | {
              name: string;
              reward_type: string;
            }[]
          | null;
        child_profiles:
          | {
              display_name: string;
            }
          | {
              display_name: string;
            }[]
          | null;
      }
    | {
        id: string;
        child_profile_id: string;
        rewards:
          | {
              name: string;
              reward_type: string;
            }
          | {
              name: string;
              reward_type: string;
            }[]
          | null;
        child_profiles:
          | {
              display_name: string;
            }
          | {
              display_name: string;
            }[]
          | null;
      }[]
    | null;
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function firstRelation<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

function ChallengeAdmin({
  challenges,
  refresh
}: {
  challenges: ChallengeRow[];
  refresh: () => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [challengeType, setChallengeType] = useState("weekly");
  const [accessLevel, setAccessLevel] = useState("free");
  const [xp, setXp] = useState("100");
  const [parentApproval, setParentApproval] = useState(false);
  const [status, setStatus] = useState("draft");
  const [steps, setSteps] = useState("");
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setWorking(true);
    setMessage("");

    const stepPayload = steps
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => ({
        title: line,
        instructions: null,
        is_required: true,
        xp_reward: 0
      }));

    const { error } = await supabase.rpc("admin_create_challenge", {
      p_title: title.trim(),
      p_slug: (slug || slugify(title)).trim(),
      p_challenge_type: challengeType,
      p_description: description.trim() || undefined,
      p_instructions: undefined,
      p_access_level: accessLevel,
      p_xp_reward: Number(xp) || 0,
      p_parent_approval_required: parentApproval,
      p_status: status,
      p_steps: stepPayload
    });

    setWorking(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setTitle("");
    setSlug("");
    setDescription("");
    setSteps("");
    setParentApproval(false);
    setMessage("Challenge created.");
    await refresh();
  }

  async function toggleStatus(challenge: ChallengeRow) {
    const nextStatus = challenge.status === "published" ? "draft" : "published";
    const { error } = await supabase
      .from("challenges")
      .update({ status: nextStatus })
      .eq("id", challenge.id);

    if (error) {
      setMessage(error.message);
      return;
    }

    await refresh();
  }

  return (
    <div className="admin-two-column">
      <section className="admin-card">
        <p className="eyebrow red">Create</p>
        <h2>New challenge</h2>
        <form className="admin-form" onSubmit={submit}>
          <label>
            Challenge title
            <input
              required
              value={title}
              onChange={(event) => {
                setTitle(event.target.value);
                if (!slug) setSlug(slugify(event.target.value));
              }}
            />
          </label>
          <label>
            Slug
            <input required value={slug} onChange={(event) => setSlug(slugify(event.target.value))} />
          </label>
          <label className="full">
            Description
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} />
          </label>
          <label>
            Type
            <select value={challengeType} onChange={(event) => setChallengeType(event.target.value)}>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="book">Book</option>
              <option value="family">Family</option>
              <option value="prayer">Prayer</option>
              <option value="scripture">Scripture</option>
              <option value="kindness">Kindness</option>
              <option value="outreach">Outreach</option>
              <option value="reading">Reading</option>
              <option value="school">School</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label>
            Access
            <select value={accessLevel} onChange={(event) => setAccessLevel(event.target.value)}>
              <option value="free">Free</option>
              <option value="member">Member</option>
              <option value="premium">Premium</option>
            </select>
          </label>
          <label>
            XP reward
            <input type="number" min="0" value={xp} onChange={(event) => setXp(event.target.value)} />
          </label>
          <label>
            Initial status
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </label>
          <label className="full">
            Challenge steps
            <textarea
              value={steps}
              onChange={(event) => setSteps(event.target.value)}
              placeholder={"Enter one required step per line\nSay the Power Verse\nEncourage someone today"}
            />
          </label>
          <label className="admin-check full">
            <input
              type="checkbox"
              checked={parentApproval}
              onChange={(event) => setParentApproval(event.target.checked)}
            />
            Require guardian approval to complete
          </label>
          {message && <div className="form-message full">{message}</div>}
          <button className="primary-button full" disabled={working}>
            {working ? "Creating..." : "Create challenge"}
          </button>
        </form>
      </section>

      <section className="admin-card">
        <div className="section-heading compact-heading">
          <div>
            <p className="eyebrow gold">Library</p>
            <h2>Challenges</h2>
          </div>
          <span className="pill">{challenges.length} total</span>
        </div>
        <div className="admin-list">
          {challenges.map((challenge) => (
            <article key={challenge.id} className="admin-list-row">
              <div>
                <strong>{challenge.title}</strong>
                <small>
                  {challenge.challenge_type.replaceAll("_", " ")} · {challenge.xp_reward} XP · {challenge.access_level}
                </small>
              </div>
              <button
                type="button"
                className={challenge.status === "published" ? "status-chip done" : "status-chip"}
                onClick={() => void toggleStatus(challenge)}
              >
                {challenge.status}
              </button>
            </article>
          ))}
          {!challenges.length && <p className="muted">No challenges yet.</p>}
        </div>
      </section>
    </div>
  );
}

function BadgeAdmin({ badges, refresh }: { badges: BadgeRow[]; refresh: () => Promise<void> }) {
  const [name, setName] = useState("");
  const [badgeKey, setBadgeKey] = useState("");
  const [description, setDescription] = useState("");
  const [rarity, setRarity] = useState("standard");
  const [badgeFamilyKey, setBadgeFamilyKey] = useState("");
  const [badgeTier, setBadgeTier] = useState("");
  const [ruleType, setRuleType] = useState("xp_threshold");
  const [threshold, setThreshold] = useState("500");
  const [streakKey, setStreakKey] = useState("challenge_completion");
  const [challengeType, setChallengeType] = useState("scripture");
  const [tokenType, setTokenType] = useState("weekly_star");
  const [activityEventType, setActivityEventType] = useState("scripture_memorized");
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setWorking(true);
    setMessage("");

    const { error } = await supabase.rpc("admin_create_lifetime_badge_level", {
      p_badge_key: badgeKey || slugify(name),
      p_name: name.trim(),
      p_rule_type: ruleType,
      p_threshold_value: ruleType === "manual" ? undefined : Number(threshold),
      p_description: description.trim() || undefined,
      p_badge_family_key: badgeFamilyKey.trim() || undefined,
      p_tier: badgeTier || undefined,
      p_rarity: rarity,
      p_streak_key: ruleType === "streak" ? streakKey : undefined,
      p_challenge_type: ruleType === "challenge_type_count" ? challengeType : undefined,
      p_token_type: ruleType === "token_threshold" ? tokenType : undefined,
      p_activity_event_type: ruleType === "activity_event_count" ? activityEventType : undefined
    });

    setWorking(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setName("");
    setBadgeKey("");
    setDescription("");
    setBadgeFamilyKey("");
    setBadgeTier("");
    setMessage("Lifetime badge level created.");
    await refresh();
  }

  return (
    <div className="admin-two-column">
      <section className="admin-card">
        <p className="eyebrow red">Create</p>
        <h2>Badge + earning rule</h2>
        <form className="admin-form" onSubmit={submit}>
          <label>
            Badge name
            <input
              required
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                if (!badgeKey) setBadgeKey(slugify(event.target.value));
              }}
            />
          </label>
          <label>
            Badge key
            <input required value={badgeKey} onChange={(event) => setBadgeKey(slugify(event.target.value))} />
          </label>
          <label className="full">
            Description
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} />
          </label>
          <label>
            Badge family
            <input
              value={badgeFamilyKey}
              onChange={(event) => setBadgeFamilyKey(slugify(event.target.value))}
              placeholder="example: scripture-master"
            />
          </label>
          <label>
            Tier
            <select value={badgeTier} onChange={(event) => setBadgeTier(event.target.value)}>
              <option value="">No tier</option>
              <option value="bronze">Bronze</option>
              <option value="silver">Silver</option>
              <option value="gold">Gold</option>
              <option value="platinum">Platinum</option>
              <option value="diamond">Diamond</option>
              <option value="legendary">Legendary</option>
            </select>
          </label>
          <label>
            Rarity
            <select value={rarity} onChange={(event) => setRarity(event.target.value)}>
              <option value="standard">Standard</option>
              <option value="special">Special</option>
              <option value="rare">Rare</option>
              <option value="legendary">Legendary</option>
            </select>
          </label>
          <label>
            Rule
            <select value={ruleType} onChange={(event) => setRuleType(event.target.value)}>
              <option value="xp_threshold">XP threshold</option>
              <option value="challenge_count">Challenges completed</option>
              <option value="adventure_count">Adventures completed</option>
              <option value="streak">Streak</option>
              <option value="challenge_type_count">Challenge type count</option>
              <option value="token_threshold">Achievement token total</option>
              <option value="activity_event_count">Activity completion count</option>
              <option value="manual">Manual award</option>
            </select>
          </label>
          {ruleType !== "manual" && (
            <label>
              Threshold
              <input type="number" min="1" value={threshold} onChange={(event) => setThreshold(event.target.value)} />
            </label>
          )}
          {ruleType === "streak" && (
            <label>
              Streak key
              <input value={streakKey} onChange={(event) => setStreakKey(event.target.value)} />
            </label>
          )}
          {ruleType === "challenge_type_count" && (
            <label>
              Challenge type
              <select value={challengeType} onChange={(event) => setChallengeType(event.target.value)}>
                <option value="scripture">Scripture</option>
                <option value="prayer">Prayer</option>
                <option value="kindness">Kindness</option>
                <option value="outreach">Outreach</option>
                <option value="reading">Reading</option>
                <option value="family">Family</option>
                <option value="weekly">Weekly</option>
              </select>
            </label>
          )}
          {ruleType === "token_threshold" && (
            <label>
              Achievement token
              <select value={tokenType} onChange={(event) => setTokenType(event.target.value)}>
                <option value="weekly_star">Weekly Star</option>
              </select>
            </label>
          )}
          {ruleType === "activity_event_count" && (
            <label>
              Activity
              <select value={activityEventType} onChange={(event) => setActivityEventType(event.target.value)}>
                <option value="scripture_memorized">Power Verse memorized</option>
                <option value="devotional_completed">Devotional day completed</option>
                <option value="prayer_activity_completed">Prayer activity completed</option>
                <option value="book_completed">Book completed</option>
                <option value="challenge_completed">Challenge completed</option>
                <option value="adventure_completed">Adventure completed</option>
              </select>
            </label>
          )}
          {message && <div className="form-message full">{message}</div>}
          <button className="primary-button full" disabled={working}>
            {working ? "Creating..." : "Create lifetime badge level"}
          </button>
        </form>
      </section>

      <section className="admin-card">
        <div className="section-heading compact-heading">
          <div>
            <p className="eyebrow gold">Progression</p>
            <h2>Badges</h2>
          </div>
          <span className="pill">{badges.length} total</span>
        </div>
        <div className="admin-list">
          {badges.map((badge) => {
            const rule = badge.badge_rules?.[0];
            return (
              <article key={badge.id} className="admin-list-row">
                <div>
                  <strong>{badge.name}</strong>
                  <small>
                    {badge.badge_tier ? `${badge.badge_tier} · ` : ""}{badge.rarity} · {rule?.rule_type?.replaceAll("_", " ") || "manual"}
                    {rule?.threshold_value ? ` · ${rule.threshold_value}` : ""}
                    {badge.badge_family_key ? ` · ${badge.badge_family_key}` : ""}
                  </small>
                </div>
                <span className={badge.is_active ? "status-chip done" : "status-chip"}>
                  {badge.is_active ? "active" : "inactive"}
                </span>
              </article>
            );
          })}
          {!badges.length && <p className="muted">No badges yet. Names can be finalized before launch.</p>}
        </div>
      </section>
    </div>
  );
}

function RewardAdmin({ rewards, refresh }: { rewards: RewardRow[]; refresh: () => Promise<void> }) {
  const [name, setName] = useState("");
  const [rewardKey, setRewardKey] = useState("");
  const [description, setDescription] = useState("");
  const [rewardType, setRewardType] = useState("digital");
  const [xpRequired, setXpRequired] = useState("1000");
  const [accessLevel, setAccessLevel] = useState("member");
  const [inventory, setInventory] = useState("");
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setWorking(true);
    setMessage("");

    const { error } = await supabase.rpc("admin_create_reward", {
      p_reward_key: rewardKey || slugify(name),
      p_name: name.trim(),
      p_description: description.trim() || undefined,
      p_reward_type: rewardType,
      p_xp_required: xpRequired ? Number(xpRequired) : undefined,
      p_access_level: accessLevel,
      p_inventory_quantity: inventory ? Number(inventory) : undefined
    });

    setWorking(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setName("");
    setRewardKey("");
    setDescription("");
    setMessage("Reward created.");
    await refresh();
  }

  return (
    <div className="admin-two-column">
      <section className="admin-card">
        <p className="eyebrow red">Create</p>
        <h2>New reward</h2>
        <form className="admin-form" onSubmit={submit}>
          <label>
            Reward name
            <input
              required
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                if (!rewardKey) setRewardKey(slugify(event.target.value));
              }}
            />
          </label>
          <label>
            Reward key
            <input required value={rewardKey} onChange={(event) => setRewardKey(slugify(event.target.value))} />
          </label>
          <label className="full">
            Description
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} />
          </label>
          <label>
            Type
            <select value={rewardType} onChange={(event) => setRewardType(event.target.value)}>
              <option value="digital">Digital</option>
              <option value="physical">Physical</option>
              <option value="experience">Experience</option>
              <option value="discount">Discount</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label>
            Access
            <select value={accessLevel} onChange={(event) => setAccessLevel(event.target.value)}>
              <option value="free">Free</option>
              <option value="member">Member</option>
              <option value="premium">Premium</option>
            </select>
          </label>
          <label>
            XP required
            <input type="number" min="0" value={xpRequired} onChange={(event) => setXpRequired(event.target.value)} />
          </label>
          <label>
            Inventory <span className="optional">(optional)</span>
            <input type="number" min="0" value={inventory} onChange={(event) => setInventory(event.target.value)} />
          </label>
          {message && <div className="form-message full">{message}</div>}
          <button className="primary-button full" disabled={working}>
            {working ? "Creating..." : "Create reward"}
          </button>
        </form>
      </section>

      <section className="admin-card">
        <div className="section-heading compact-heading">
          <div>
            <p className="eyebrow gold">Catalog</p>
            <h2>Rewards</h2>
          </div>
          <span className="pill">{rewards.length} total</span>
        </div>
        <div className="admin-list">
          {rewards.map((reward) => (
            <article key={reward.id} className="admin-list-row">
              <div>
                <strong>{reward.name}</strong>
                <small>
                  {reward.reward_type} · {reward.xp_required ?? 0} XP · {reward.access_level}
                  {reward.inventory_quantity !== null ? ` · ${reward.inventory_quantity} left` : ""}
                </small>
              </div>
              <span className={reward.is_active ? "status-chip done" : "status-chip"}>
                {reward.is_active ? "active" : "inactive"}
              </span>
            </article>
          ))}
          {!rewards.length && <p className="muted">No rewards yet.</p>}
        </div>
      </section>
    </div>
  );
}

function RedemptionAdmin({
  redemptions,
  canFulfill,
  refresh
}: {
  redemptions: RedemptionRow[];
  canFulfill: boolean;
  refresh: () => Promise<void>;
}) {
  const [message, setMessage] = useState("");

  async function move(id: string, status: string) {
    setMessage("");
    const { error } = await supabase.from("reward_redemptions").update({ status }).eq("id", id);
    if (error) {
      setMessage(error.message);
      return;
    }
    await refresh();
  }

  return (
    <section className="admin-card">
      <div className="section-heading compact-heading">
        <div>
          <p className="eyebrow red">Operations</p>
          <h2>Reward fulfillment</h2>
        </div>
        <span className="pill">{redemptions.length} requests</span>
      </div>
      {message && <div className="form-message">{message}</div>}
      <div className="admin-list">
        {redemptions.map((row) => {
          const unlock = firstRelation(row.reward_unlocks);
          const reward = unlock ? firstRelation(unlock.rewards) : null;
          const child = unlock ? firstRelation(unlock.child_profiles) : null;

          return (
            <article key={row.id} className="redemption-row">
              <div>
                <strong>{reward?.name || "Reward"}</strong>
                <small>
                  {child?.display_name || "Child"} · requested {new Date(row.requested_at).toLocaleDateString()}
                </small>
              </div>
              <span className="status-chip">{row.status}</span>
              {canFulfill && row.status === "requested" && (
                <div className="admin-row-actions">
                  <button className="secondary-button" onClick={() => void move(row.id, "approved")}>Approve</button>
                  <button className="text-button small" onClick={() => void move(row.id, "denied")}>Deny</button>
                </div>
              )}
              {canFulfill && row.status === "approved" && (
                <div className="admin-row-actions">
                  <button className="secondary-button" onClick={() => void move(row.id, "processing")}>Processing</button>
                  <button className="primary-button compact" onClick={() => void move(row.id, "fulfilled")}>Fulfill</button>
                </div>
              )}
              {canFulfill && row.status === "processing" && (
                <div className="admin-row-actions">
                  <button className="primary-button compact" onClick={() => void move(row.id, "fulfilled")}>Mark fulfilled</button>
                </div>
              )}
            </article>
          );
        })}
        {!redemptions.length && <p className="muted">No reward requests yet.</p>}
      </div>
    </section>
  );
}

export function AdminPortal({
  user,
  role,
  onExit
}: {
  user: User;
  role: string;
  onExit: () => void;
}) {
  const [section, setSection] = useState<"challenges" | "series" | "faith" | "familyfaith" | "books" | "content" | "media" | "badges" | "rewards" | "fulfillment">("challenges");
  const [challenges, setChallenges] = useState<ChallengeRow[]>([]);
  const [badges, setBadges] = useState<BadgeRow[]>([]);
  const [rewards, setRewards] = useState<RewardRow[]>([]);
  const [redemptions, setRedemptions] = useState<RedemptionRow[]>([]);
  const [error, setError] = useState("");

  const canCreateContent = useMemo(
    () => ["super_admin", "content_admin", "operations_admin"].includes(role),
    [role]
  );
  const canFulfill = useMemo(
    () => ["super_admin", "operations_admin"].includes(role),
    [role]
  );

  const refresh = useCallback(async () => {
    setError("");
    const [challengeResult, badgeResult, rewardResult, redemptionResult] = await Promise.all([
      supabase
        .from("challenges")
        .select("id,title,slug,challenge_type,status,access_level,xp_reward,parent_approval_required,created_at")
        .order("created_at", { ascending: false }),
      supabase
        .from("badges")
        .select("id,badge_key,name,description,rarity,badge_scope,badge_tier,badge_family_key,is_active,badge_rules(id,rule_type,threshold_value,streak_key,challenge_type,token_type,activity_event_type,is_active)")
        .order("created_at", { ascending: false }),
      supabase
        .from("rewards")
        .select("id,reward_key,name,description,reward_type,xp_required,access_level,inventory_quantity,is_active")
        .order("created_at", { ascending: false }),
      supabase
        .from("reward_redemptions")
        .select("id,status,requested_at,fulfillment_reference,reward_unlocks(id,child_profile_id,rewards(name,reward_type),child_profiles(display_name))")
        .order("requested_at", { ascending: false })
        .limit(100)
    ]);

    const firstError = challengeResult.error || badgeResult.error || rewardResult.error || redemptionResult.error;
    if (firstError) {
      setError(firstError.message);
      return;
    }

    setChallenges((challengeResult.data ?? []) as ChallengeRow[]);
    setBadges((badgeResult.data ?? []) as BadgeRow[]);
    setRewards((rewardResult.data ?? []) as RewardRow[]);
    setRedemptions((redemptionResult.data ?? []) as RedemptionRow[]);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <div className="admin-shell">
      <header className="app-header admin-header">
        <div className="brand">
          <img src="https://dustincourageous.com/assets/images/dc-shield.jpeg" alt="Dustin Courageous DC Shield" />
          <div>
            <strong>Courageous Kids</strong>
            <span>Adventure Club Admin</span>
          </div>
        </div>
        <div className="header-actions">
          <span className="admin-role">{role.replaceAll("_", " ")}</span>
          <button className="text-button small" onClick={onExit}>Family view</button>
          <button className="text-button small" onClick={() => void signOut()}>Sign out</button>
        </div>
      </header>

      <div className="admin-layout">
        <aside className="admin-nav">
          <p className="eyebrow">Management</p>
          {[
            ["challenges", "Challenges"],
            ["series", "Weekly Series"],
            ["faith", "Faith Content"],
            ["familyfaith", "Family Faith"],
            ["books", "Books"],
            ["content", "Content Studio"],
            ["media", "Media Library"],
            ["badges", "Badges"],
            ["rewards", "Rewards"],
            ["fulfillment", "Fulfillment"]
          ].map(([key, label]) => (
            <button
              key={key}
              className={section === key ? "admin-nav-button active" : "admin-nav-button"}
              onClick={() => setSection(key as typeof section)}
            >
              {label}
            </button>
          ))}
          <div className="admin-user">
            <span>Signed in as</span>
            <strong>{user.email}</strong>
          </div>
        </aside>

        <main className="admin-main">
          <div className="admin-page-heading">
            <div>
              <p className="eyebrow red">Dustin Courageous</p>
              <h1>Adventure Club Control Center</h1>
              <p>Build, publish, reward, and manage the family experience from one place.</p>
            </div>
          </div>

          {error && <div className="form-message">{error}</div>}

          {!canCreateContent && section !== "fulfillment" ? (
            <section className="admin-card">
              <h2>Read-only access</h2>
              <p className="muted">Your current admin role can review this area but cannot create or edit content.</p>
            </section>
          ) : section === "challenges" ? (
            <ChallengeAdmin challenges={challenges} refresh={refresh} />
          ) : section === "series" ? (
            <WeeklySeriesAdmin />
          ) : section === "faith" ? (
            <FaithContentAdmin />
          ) : section === "familyfaith" ? (
            <FamilyFaithAdmin />
          ) : section === "books" ? (
            <BookAdmin />
          ) : section === "content" ? (
            <ContentAdmin />
          ) : section === "media" ? (
            <MediaAdmin />
          ) : section === "badges" ? (
            <BadgeAdmin badges={badges} refresh={refresh} />
          ) : section === "rewards" ? (
            <RewardAdmin rewards={rewards} refresh={refresh} />
          ) : (
            <RedemptionAdmin redemptions={redemptions} canFulfill={canFulfill} refresh={refresh} />
          )}
        </main>
      </div>
    </div>
  );
}
