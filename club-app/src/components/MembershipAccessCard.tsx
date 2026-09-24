import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

type Summary = {
  household_id: string;
  plan_key: string | null;
  plan_name: string | null;
  plan_description: string | null;
  subscription_status: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean | null;
  plan_entitlements: string[];
  granted_entitlements: string[];
};

const labels: Record<string,string> = {
  club_access: "Adventure Club core",
  premium_content: "Premium content",
  member_downloads: "Member downloads",
  rewards_redemption: "Reward redemption",
  family_faith: "Faith at Home",
  book_companions: "Book companion adventures",
  digital_books: "Digital book library",
  full_challenge_library: "Complete challenge library"
};

export function MembershipAccessCard({ householdId }: { householdId: string }) {
  const [summary,setSummary]=useState<Summary|null>(null);
  const [error,setError]=useState("");

  const load=useCallback(async()=>{
    const {data,error:loadError}=await supabase
      .from("household_membership_summary")
      .select("*")
      .eq("household_id",householdId)
      .maybeSingle();

    if(loadError){
      setError(loadError.message);
      return;
    }

    setSummary((data??null) as Summary|null);
  },[householdId]);

  useEffect(()=>{void load();},[load]);

  const entitlements=useMemo(
    ()=>Array.from(new Set([...(summary?.plan_entitlements??[]),...(summary?.granted_entitlements??[])])),
    [summary]
  );

  return (
    <section className="membership-access-card">
      <div className="membership-access-head">
        <div>
          <p className="eyebrow red">Membership</p>
          <h2>{summary?.plan_name || "Adventure Club Free"}</h2>
          <p>{summary?.plan_description || "Core Adventure Club household access."}</p>
        </div>
        <span className="status-chip done">{summary?.subscription_status || "active"}</span>
      </div>

      {error && <div className="form-message">{error}</div>}

      <div className="membership-feature-grid">
        {entitlements.map((key)=>(
          <div key={key}>
            <span>✓</span>
            <strong>{labels[key] || key.replaceAll("_"," ")}</strong>
          </div>
        ))}
      </div>

      <p className="membership-footnote">
        Premium pricing and paid billing are not locked yet. This card reads the household's real access from the Dustin backend.
      </p>
    </section>
  );
}
