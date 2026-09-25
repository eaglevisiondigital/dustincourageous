import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  club_access: "Adventure Club Core",
  premium_content: "Premium Content",
  member_downloads: "Member Downloads",
  rewards_redemption: "Reward Redemption",
  family_faith: "Faith At Home",
  book_companions: "Book Companion Adventures",
  digital_books: "Digital Book Library",
  full_challenge_library: "Complete Challenge Library"
};

export function MembershipAccessCard({ householdId }: { householdId: string }) {
  const [summary,setSummary]=useState<Summary|null>(null);
  const [error,setError]=useState("");
  const [loading,setLoading]=useState(true);
  const loadVersion=useRef(0);

  const load=useCallback(async()=>{
    const version=++loadVersion.current;
    setLoading(true);
    setError("");
    setSummary(null);
    try {
    const {data,error:loadError}=await supabase
      .from("household_membership_summary")
      .select("*")
      .eq("household_id",householdId)
      .maybeSingle();

    if(version!==loadVersion.current)return;
    if(loadError)throw loadError;

    setSummary((data??null) as Summary|null);
    } catch {
      if(version===loadVersion.current)setError("Membership details could not be loaded. Please try again.");
    } finally {
      if(version===loadVersion.current)setLoading(false);
    }
  },[householdId]);

  useEffect(()=>{void load();return ()=>{loadVersion.current+=1;};},[load]);

  const entitlements=useMemo(
    ()=>Array.from(new Set([...(summary?.plan_entitlements??[]),...(summary?.granted_entitlements??[])])),
    [summary]
  );

  if(loading)return <section className="membership-access-card" aria-busy="true"><p role="status">Loading membership...</p></section>;
  if(error)return <section className="membership-access-card"><p role="alert">{error}</p><button className="secondary-button" onClick={()=>void load()}>Try Again</button></section>;
  if(!summary)return <section className="membership-access-card"><h2>Membership</h2><p>No membership details are available yet.</p><button className="secondary-button" onClick={()=>void load()}>Refresh Membership</button></section>;

  return (
    <section className="membership-access-card">
      <div className="membership-access-head">
        <div>
          <p className="eyebrow red">Membership</p>
          <h2>{summary.plan_name || "Household access"}</h2>
          <p>{summary.plan_description || "Available household benefits are listed below."}</p>
        </div>
        <span className="status-chip">{summary.subscription_status || "No current subscription"}</span>
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
        Paid enrollment is not open yet. Benefits apply to published, available content. Book companion activities are separate from full digital books.
      </p>
    </section>
  );
}
