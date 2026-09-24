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

type HouseholdAdult = {
  user_id: string;
  role: string;
  status: string;
  email: string;
  display_name: string | null;
};

type HouseholdInvitation = {
  id: string;
  email: string;
  role: string;
  status: string;
  expires_at: string;
  created_at: string;
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
  const [adults, setAdults] = useState<HouseholdAdult[]>([]);
  const [invitations, setInvitations] = useState<HouseholdInvitation[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("adult");
  const [inviteLink, setInviteLink] = useState("");
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

    const [plansResult,subResult,grantResult,prefResult,adultResult,inviteResult] = await Promise.all([
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
        .maybeSingle(),
      supabase.rpc("get_household_adults",{p_household_id:householdId}),
      supabase
        .from("household_invitations")
        .select("id,email,role,status,expires_at,created_at")
        .eq("household_id",householdId)
        .order("created_at",{ascending:false})
    ]);

    const error=plansResult.error||subResult.error||grantResult.error||prefResult.error||adultResult.error||inviteResult.error;
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
    setAdults((adultResult.data??[]) as HouseholdAdult[]);
    setInvitations((inviteResult.data??[]) as HouseholdInvitation[]);
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

  async function createInvitation(event:FormEvent){
    event.preventDefault();
    setWorking(true);setMessage("");setInviteLink("");

    const {data,error}=await supabase.rpc("create_household_invitation",{
      p_household_id:householdId,
      p_email:inviteEmail.trim(),
      p_role:inviteRole,
      p_expires_days:7
    });

    setWorking(false);
    if(error)return setMessage(error.message);

    const row=data?.[0];
    if(row){
      const link=`${window.location.origin}/invite?id=${encodeURIComponent(row.invitation_id)}&token=${encodeURIComponent(row.invitation_token)}`;
      setInviteLink(link);
      setMessage("Invitation created. Copy the secure link and send it to the invited adult.");
    }
    setInviteEmail("");
    await load();
  }

  async function copyInvite(){
    if(!inviteLink)return;
    try{
      await navigator.clipboard.writeText(inviteLink);
      setMessage("Invitation link copied.");
    }catch{
      setMessage("Copy the invitation link manually.");
    }
  }

  async function revokeInvitation(invitationId:string){
    setWorking(true);setMessage("");
    const {error}=await supabase.rpc("revoke_household_invitation",{p_invitation_id:invitationId});
    setWorking(false);
    if(error)return setMessage(error.message);
    setMessage("Invitation revoked.");
    await load();
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
        <div className="settings-stack">
          <section className="settings-card">
            <p className="eyebrow gold">Family Hub</p>
            <h2>Household settings</h2>
            <form className="form-stack" onSubmit={saveHousehold}>
              <label>Family Hub name<input required value={name} onChange={e=>setName(e.target.value)}/></label>
              <label>Timezone<input required value={householdTimezone} onChange={e=>setHouseholdTimezone(e.target.value)}/></label>
              <button className="primary-button" disabled={working}>Save Household</button>
            </form>
          </section>

          <section className="settings-card">
            <div className="section-heading compact-heading">
              <div>
                <p className="eyebrow red">Approved Adults</p>
                <h2>Family access</h2>
              </div>
              <span className="pill">{adults.length} adult{adults.length===1?"":"s"}</span>
            </div>

            <div className="adult-list">
              {adults.map(adult=>(
                <article className="adult-row" key={adult.user_id}>
                  <div className="avatar">{(adult.display_name||adult.email).slice(0,1).toUpperCase()}</div>
                  <div>
                    <strong>{adult.display_name||adult.email}</strong>
                    <small>{adult.email}</small>
                  </div>
                  <span className="status-chip done">{adult.role}</span>
                </article>
              ))}
            </div>

            <form className="invite-form" onSubmit={createInvitation}>
              <label>
                Adult email
                <input required type="email" value={inviteEmail} onChange={e=>setInviteEmail(e.target.value)} placeholder="parent@example.com"/>
              </label>
              <label>
                Role
                <select value={inviteRole} onChange={e=>setInviteRole(e.target.value)}>
                  <option value="parent">Parent</option>
                  <option value="guardian">Guardian</option>
                  <option value="adult">Approved Adult</option>
                </select>
              </label>
              <button className="secondary-button" disabled={working}>Create Invite Link</button>
            </form>

            {inviteLink&&(
              <div className="invite-link-box">
                <span>Secure invite link</span>
                <code>{inviteLink}</code>
                <button className="primary-button compact" type="button" onClick={()=>void copyInvite()}>Copy Link</button>
              </div>
            )}

            {invitations.some(invite=>invite.status==="pending")&&(
              <div className="pending-invites">
                <p className="eyebrow gold">Pending Invites</p>
                {invitations.filter(invite=>invite.status==="pending").map(invite=>(
                  <article key={invite.id}>
                    <div>
                      <strong>{invite.email}</strong>
                      <small>{invite.role} · expires {new Date(invite.expires_at).toLocaleDateString()}</small>
                    </div>
                    <button className="text-button small" type="button" onClick={()=>void revokeInvitation(invite.id)}>Revoke</button>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
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
