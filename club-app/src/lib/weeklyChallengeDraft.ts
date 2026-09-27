import type { Database } from "../types/database";

type WeeklyDraftArgs = Database["public"]["Functions"]["admin_create_weekly_challenge"]["Args"];

export function nextMondayDate(today = new Date()) {
  const date = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  date.setDate(date.getDate() + (date.getDay() === 0 ? 1 : 8 - date.getDay()));
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function weeklyDraftArgs(input: {
  seriesId: string; title: string; slug: string; periodStart: string;
  description: string; challengeType: string; accessLevel: "free" | "premium";
  xpReward: string; parentApprovalRequired: boolean; steps: string;
}): WeeklyDraftArgs {
  if (!input.seriesId) throw new Error("Select a weekly challenge series first.");
  if (!input.title.trim() || !input.slug.trim()) throw new Error("Enter a challenge title and slug.");
  const date = new Date(input.periodStart + "T00:00:00Z");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.periodStart) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== input.periodStart) {
    throw new Error("Choose a valid week start date.");
  }
  const xp = Number(input.xpReward);
  if (!input.xpReward.trim() || !Number.isInteger(xp) || xp < 0 || xp > 2147483647) {
    throw new Error("XP must be a whole number of zero or more within the supported range.");
  }
  if (!["free", "premium"].includes(input.accessLevel)) throw new Error("Choose Free or paid membership access.");
  return {
    p_series_id: input.seriesId,
    p_title: input.title.trim(),
    p_slug: input.slug.trim(),
    p_period_start: input.periodStart,
    p_description: input.description.trim() || undefined,
    p_challenge_type: input.challengeType,
    p_access_level: input.accessLevel,
    p_xp_reward: xp,
    p_parent_approval_required: input.parentApprovalRequired,
    p_status: "draft",
    p_steps: input.steps.split("\n").map(line => line.trim()).filter(Boolean)
      .map(title => ({ title, instructions: null, is_required: true, xp_reward: 0 }))
  };
}
