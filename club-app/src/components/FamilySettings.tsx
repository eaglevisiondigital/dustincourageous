import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

type Plan = {
  id: string;
  plan_key: string;
  name: string;
  description: string | null;
  monthly_price_cents: number | null;
  annual_price_cents: number | null;
};

type Subscription = {
  id: string;
  plan_id: string;
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  membership_plans: Plan | Plan[] | null;
};

type Preference = {
  email_enabled: boolean;
  push_enabled: boolean;
  product_updates: boolean;
  child_progress: boolean;
  rewards: boolean;
  family_reminders: boolean;
  marketing: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  timezone: string;
};

function firstRelation<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

function price(cents: number | null, period: string) {
  if (cents === null) return "Pricing to be finalized";
  if (cents === 0) return "Free";
  return `$${(cents / 100).toFixed(2)}/${period}`;
}

export function FamilySettings({
  user,
  householdId,
  householdName,
  timezone,
  onHouseholdUpdated
}: {
  user: User;
  householdId: string;
  householdName: string;
  timezone: string;
  onHouseholdUpdated: () => Promise<void>;
}) {
  const [tab, setTab] = useState<"membership"|"notifications"|"household"|"security">("membership");
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [planEntitlements, setPlanEntitlements] = useState<string[]>([]);
  const [grants, setGrants] = useState<string[]>([]);
  const [preferences, setPreferences] = useState<Preference>({
    email_enabled:true,
    push_enabled:true,
    product_updates:true,
    child_progress:true,
    rewards:true,
    family_reminders:true,
    marketing:false,
    quiet_hours_start:null,
    quiet_hours_end:null,
    timezone
  });
  const [name, setName] = useState(householdName);
  const [householdTimezone, setHouseholdTimezone] = useState(timezone);
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setMessage("");

    const [plansResult,subResult,grantResult,prefResult] = await Promise.all([
      supabase
        .from("membership_plans")
        .select("id,plan_key,name,description,monthly_price_cents,annual_price_cents")
        .eq("is_active",true)
        .order("monthly_price_cents",{ascending:true,nullsFirst:false}),
      supabase
        .from("household_subscriptions")
        .select("id,plan_id,status,current_period_end,cancel_at_period_end,membership_plans(id,plan_key,name,description,monthly_price_cents,annual_price_cents)")
        .eq("household_id",householdId)
        .in("status",["trialing","active","comped","past_due"])
        .order("created_at",{ascending:false})
        .limit(1)
        .maybeSingle(),
      supabase
        .from("household_entitlement_grants")
        .select("entitlement_key")
        .eq("household_id",householdId)
        .lte("starts_at",new Date().toISOString()),
      supabase
        .from("notification_preferences")
        .select("email_enabled,push_enabled,product_updates,child_progress,rewards,family_reminders,marketing,quiet_hours_start,quiet_hours_end,timezone")
        .eq("user_id",user.id)
        .maybeSingle()
    ]);

    const error=plansResult.error||subResult.error||grantResult.error||prefResult.error;
    if(error){
      setMessage(error.message);
      return;
    }

    setPlans((plansResult.data??[]) as Plan[]);
    const sub=(subResult.data??null) as Subscription|null;
    setSubscription(sub);
    setGrants((grantResult.data??[]).map(x=>x.entitlement_key));

    if(sub?.plan_id){
      const {data,error:entError}=await supabase
        .from("plan_entitlements")
        .select("entitlement_key")
        .eq("plan_id",sub.plan_id);
      if(!entError) setPlanEntitlements((data??[]).map(x=>x.entitlement_key));
    } else {
      setPlanEntitlements([]);
    }

    if(prefResult.data) setPreferences(prefResult.data as Preference);
  },[householdId,user.id]);

  useEffect(()=>{void load();},[load]);

  const currentPlan=firstRelation(subscription?.membership_plans??null);
  const effectiveEntitlements=useMemo(
    ()=>Array.from(new Set([...planEntitlements,...grants])).sort(),
    [planEntitlements,grants]
  );

  async function savePreferences(){
    setWorking(true);setMessage("");
    const {error}=await supabase.from("notification_preferences").upsert({
      user_id:user.id,
      ...preferences
    },{onConflict:"user_id"});
    setWorking(false);
    setMessage(error?error.message:"Notification preferences saved.");
  }

  async function saveHousehold(event:FormEvent){
    event.preventDefault();setWorking(true);setMessage("");
    const {error}=await supabase.from("households").update({
      name:name.trim(),
      timezone:householdTimezone
    }).eq("id",householdId);
    setWorking(false);
    if(error)return setMessage(error.message);
    setMessage("Family Hub settings saved.");
    await onHouseholdUpdated();
  }

  async function savePin(event:FormEvent){
    event.preventDefault();setMessage("");
    if(!/^\d{4,6}$/.test(pin)) return setMessage("Choose a 4 to 6 digit guardian PIN.");
    if(pin!==confirmPin) return setMessage("The PINs do not match.");
    setWorking(true);
    const {error}=await supabase.rpc("set_guardian_pin",{p_household_id:householdId,p_pin:pin});
    setWorking(false);
    if(error)return setMessage(error.message);
    setPin("");setConfirmPin("");
    setMessage("Guardian PIN updated.");
  }

  const toggle=(key:keyof Preference)=>{
    if(typeof preferences[key]!=="boolean")return;
    setPreferences(current=>({...current,[key]:!current[key]}));
  };

  return (
    <section className="family-settings">
      <nav className="family-settings-tabs">
        {[["membership","Membership"],["notifications","Notifications"],["household","Household"],["security","Guardian PIN"]].map(([key,label])=>(
          <button key={key} className={tab===key?"active":""} onClick={()=>setTab(key as typeof tab)}>{label}</button>
        ))}
      </nav>

      {message&&<div className="form-message">{message}</div>}

      {tab==="membership"&&(
        <div className="settings-stack">
          <section className="settings-card membership-current">
            <p className="eyebrow gold">Current Access</p>
            <div className="membership-plan-row">
              <div>
                <h2>{currentPlan?.name||"Adventure Club"}</h2>
                <p>{currentPlan?.description||"Family Adventure Club access."}</p>
              </div>
              <span className="status-chip done">{subscription?.status||"active"}</span>
            </div>
            {effectiveEntitlements.length>0&&(
              <div className="entitlement-list">
                {effectiveEntitlements.map(item=><span key={item}>{item.replaceAll("_"," ")}</span>)}
              </div>
            )}
          </section>

          <div className="membership-plan-grid">
            {plans.map(plan=>(
              <article className={currentPlan?.id===plan.id?"membership-plan-card current":"membership-plan-card"} key={plan.id}>
                <span>{plan.plan_key}</span>
                <h3>{plan.name}</h3>
                <p>{plan.description}</p>
                <strong>{price(plan.monthly_price_cents,"mo")}</strong>
                {plan.annual_price_cents!==null&&plan.annual_price_cents>0&&<small>{price(plan.annual_price_cents,"yr")}</small>}
                {currentPlan?.id===plan.id?(
                  <div className="status-chip done">Current plan</div>
                ):(
                  <button className="secondary-button" disabled>Upgrade checkout will connect here</button>
                )}
              </article>
            ))}
          </div>
          <p className="settings-note">Premium pricing and the payment processor are intentionally not locked yet. The entitlement system is already ready for them.</p>
        </div>
      )}

      {tab==="notifications"&&(
        <section className="settings-card">
          <p className="eyebrow red">Parent Notifications</p>
          <h2>Choose what reaches you</h2>
          <div className="preference-list">
            {[
              ["email_enabled","Email notifications"],
              ["push_enabled","Push notifications"],
              ["child_progress","Child progress milestones"],
              ["rewards","Rewards and redemptions"],
              ["family_reminders","Family reminders"],
              ["product_updates","Dustin Courageous updates"],
              ["marketing","Marketing and offers"]
            ].map(([key,label])=>(
              <button type="button" className="preference-row" key={key} onClick={()=>toggle(key as keyof Preference)}>
                <span>{label}</span>
                <strong>{preferences[key as keyof Preference]?"On":"Off"}</strong>
              </button>
            ))}
          </div>
          <button className="primary-button compact" disabled={working} onClick={()=>void savePreferences()}>Save Preferences</button>
        </section>
      )}

      {tab==="household"&&(
        <section className="settings-card">
          <p className="eyebrow gold">Family Hub</p>
          <h2>Household settings</h2>
          <form className="form-stack" onSubmit={saveHousehold}>
            <label>Family Hub name<input required value={name} onChange={e=>setName(e.target.value)}/></label>
            <label>Timezone<input required value={householdTimezone} onChange={e=>setHouseholdTimezone(e.target.value)}/></label>
            <button className="primary-button" disabled={working}>Save Household</button>
          </form>
        </section>
      )}

      {tab==="security"&&(
        <section className="settings-card">
          <p className="eyebrow red">Guardian Security</p>
          <h2>Change guardian PIN</h2>
          <p className="muted">The PIN protects Family Hub and parent controls when the device is handed to a child.</p>
          <form className="form-stack" onSubmit={savePin}>
            <label>New PIN<input required type="password" inputMode="numeric" maxLength={6} value={pin} onChange={e=>setPin(e.target.value.replace(/\D/g,"").slice(0,6))}/></label>
            <label>Confirm PIN<input required type="password" inputMode="numeric" maxLength={6} value={confirmPin} onChange={e=>setConfirmPin(e.target.value.replace(/\D/g,"").slice(0,6))}/></label>
            <button className="primary-button" disabled={working}>Update Guardian PIN</button>
          </form>
        </section>
      )}
    </section>
  );
}
