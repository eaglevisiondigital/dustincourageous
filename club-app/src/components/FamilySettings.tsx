import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { saveNotificationPreferences } from "../lib/familyActions";
import { revokeHouseholdInvite, saveHouseholdSettings } from "../lib/householdSettings";
import { FamilyRelationshipSettings } from "./FamilyRelationshipSettings";

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
  if (cents === null) return "Pricing To Be Finalized";
  if (cents === 0) return "Free";
  return `$${(cents / 100).toFixed(2)}/${period}`;
}

const planFeatures: Record<string,string[]> = {
  free: [
    "Core Adventure Club and protected child profiles",
    "Rotating free Courage Challenges",
    "Power Verses and Scripture practice",
    "Selected activities, coloring pages, and printables",
    "Family Faith discussion and prayer resources",
    "Selected book previews and release updates"
  ],
  premium: [
    "Everything included with Free",
    "Digital copies of included Dustin Courageous books",
    "Complete Adventure Club challenge library",
    "Additional premium resources as the library grows"
  ]
};

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
  const [inviteLinkId,setInviteLinkId]=useState("");
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
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const loadVersion = useRef(0);
  const preferenceBusy=useRef(false);

  const load = useCallback(async () => {
    const version = ++loadVersion.current;
    const now = new Date().toISOString();
    setLoading(true);
    setLoadError("");
    setSubscription(null);
    setPlanEntitlements([]);
    setGrants([]);

    try {
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
        .select("entitlement_key,ends_at")
        .eq("household_id",householdId)
        .lte("starts_at",now),
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

    if(version !== loadVersion.current) return;
    const error=plansResult.error||subResult.error||grantResult.error||prefResult.error||adultResult.error||inviteResult.error;
    if(error){
      throw error;
    }

    setPlans((plansResult.data??[]) as Plan[]);
    const sub=(subResult.data??null) as Subscription|null;
    setSubscription(sub);
    setGrants((grantResult.data??[])
      .filter(x=>x.ends_at===null || Date.parse(x.ends_at)>Date.parse(now))
      .map(x=>x.entitlement_key));

    if(sub?.plan_id && ["trialing","active","comped"].includes(sub.status)
      && (sub.current_period_end===null || Date.parse(sub.current_period_end)>Date.parse(now))){
      const {data,error:entError}=await supabase
        .from("plan_entitlements")
        .select("entitlement_key")
        .eq("plan_id",sub.plan_id);
      if(version !== loadVersion.current) return;
      if(entError) throw entError;
      setPlanEntitlements((data??[]).map(x=>x.entitlement_key));
    } else {
      setPlanEntitlements([]);
    }

    if(prefResult.data) setPreferences(prefResult.data as Preference);
    setAdults((adultResult.data??[]) as HouseholdAdult[]);
    setInvitations((inviteResult.data??[]) as HouseholdInvitation[]);
    } catch {
      if(version === loadVersion.current) {
        setLoadError("We could not load your family settings. Please try again.");
        setPlanEntitlements([]);
        setGrants([]);
      }
    } finally {
      if(version === loadVersion.current) setLoading(false);
    }
  },[householdId,user.id]);

  useEffect(()=>{
    void load();
    return ()=>{loadVersion.current += 1;};
  },[load]);

  const currentPlan=firstRelation(subscription?.membership_plans??null);
  const effectiveEntitlements=useMemo(
    ()=>Array.from(new Set([...planEntitlements,...grants])).sort(),
    [planEntitlements,grants]
  );

  async function savePreferences(){
    if(preferenceBusy.current||working||loading||loadError)return;
    preferenceBusy.current=true;
    setWorking(true);setMessage("");
    try {
      const saved=await saveNotificationPreferences(supabase,user.id,preferences);
      const {user_id:_,...values}=saved;
      setPreferences(values);
      setMessage("Notification preferences saved.");
    } catch(error) {
      setMessage(error instanceof Error?error.message:"Preferences could not be saved. Your choices are still here to retry.");
    } finally {
      preferenceBusy.current=false;setWorking(false);
    }
  }

  async function saveHousehold(event:FormEvent){
    event.preventDefault();
    if(preferenceBusy.current||working)return;
    preferenceBusy.current=true;setWorking(true);setMessage("");
    try {
    const saved=await saveHouseholdSettings(supabase,householdId,name,householdTimezone);
    setName(saved.name);setHouseholdTimezone(saved.timezone);
    setMessage("Family Hub settings saved.");
    try {await onHouseholdUpdated();}
    catch {setMessage("Settings were saved, but the family view could not refresh. Reload to see the update.");}
    } catch(error) {
      setMessage(error instanceof Error?error.message:"Family settings could not be saved. Your edits are still here to retry.");
    } finally {preferenceBusy.current=false;setWorking(false);}
  }

  async function savePin(event:FormEvent){
    event.preventDefault();setMessage("");
    if(preferenceBusy.current||working)return;
    if(!/^\d{4,6}$/.test(pin)) return setMessage("Choose a 4 to 6 digit guardian PIN.");
    if(pin!==confirmPin) return setMessage("The PINs do not match.");
    preferenceBusy.current=true;setWorking(true);
    try {
    const {error}=await supabase.rpc("set_guardian_pin",{p_household_id:householdId,p_pin:pin});
    if(error)throw error;
    setPin("");setConfirmPin("");
    setMessage("Guardian PIN updated.");
    } catch {
      setMessage("The PIN update could not be confirmed. Try again before locking the device into Kid View.");
    } finally {preferenceBusy.current=false;setWorking(false);}
  }

  async function createInvitation(event:FormEvent){
    event.preventDefault();
    if(preferenceBusy.current||working)return;
    preferenceBusy.current=true;
    setWorking(true);setMessage("");setInviteLink("");
    setInviteLinkId("");
    try {
    const {data,error}=await supabase.rpc("create_household_invitation",{
      p_household_id:householdId,
      p_email:inviteEmail.trim(),
      p_role:inviteRole,
      p_expires_days:7
    });

    if(error)throw error;

    const row=data?.[0];
    if(row?.invitation_id&&row.invitation_token){
      const link=`${window.location.origin}/invite?id=${encodeURIComponent(row.invitation_id)}&token=${encodeURIComponent(row.invitation_token)}`;
      setInviteLink(link);
      setInviteLinkId(row.invitation_id);
      setMessage("Invitation created. Copy the secure link and send it to the invited adult.");
    } else {throw new Error("Invitation response was incomplete");}
    setInviteEmail("");
    } catch {
      setMessage("The invitation link could not be confirmed. Check the refreshed pending invitations and revoke an unwanted invite before creating another.");
    } finally {
      await load();preferenceBusy.current=false;setWorking(false);
    }
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
    if(preferenceBusy.current||working)return;
    preferenceBusy.current=true;
    setWorking(true);setMessage("");
    try {
    await revokeHouseholdInvite(supabase,householdId,invitationId);
    if(inviteLinkId===invitationId){setInviteLink("");setInviteLinkId("");}
    setMessage("Invitation revoked.");
    } catch {
      setMessage("Revocation could not be confirmed. The invitation may have changed or been accepted. Review the refreshed adult access and invitation list.");
    } finally {
      await load();preferenceBusy.current=false;setWorking(false);
    }
  }

  const toggle=(key:keyof Preference)=>{
    if(typeof preferences[key]!=="boolean")return;
    setPreferences(current=>({...current,[key]:!current[key]}));
  };

  if(loading) return <section className="family-settings" aria-busy="true"><p role="status">Loading family settings...</p></section>;
  if(loadError) return <section className="family-settings"><p role="alert">{loadError}</p><button className="secondary-button" onClick={()=>void load()}>Try Again</button></section>;

  return (
    <section className="family-settings">
      <nav className="family-settings-tabs">
        {[["membership","Membership"],["notifications","Notifications"],["household","Household"],["security","Guardian PIN"]].map(([key,label])=>(
          <button key={key} disabled={working} className={tab===key?"active":""} onClick={()=>setTab(key as typeof tab)}>{label}</button>
        ))}
      </nav>

      {message&&<div className="form-message" role="status">{message}</div>}

      {tab==="membership"&&(
        <div className="settings-stack">
          <section className="settings-card membership-current">
            <p className="eyebrow gold">Current Access</p>
            <div className="membership-plan-row">
              <div>
                <h2>{currentPlan?.name||"Adventure Club"}</h2>
                <p>{currentPlan?.description||"Family Adventure Club access."}</p>
              </div>
              <span className="status-chip">{subscription
                ? (subscription.current_period_end && Date.parse(subscription.current_period_end)<=Date.now() ? "expired" : subscription.status)
                : "No current subscription"}</span>
            </div>
            {effectiveEntitlements.length>0&&(
              <div className="entitlement-list">
                {effectiveEntitlements.map(item=><span key={item}>{item.replaceAll("_"," ")}</span>)}
              </div>
            )}
            <p className="settings-note">Access permissions are listed above. Individual content must also be published and available. Book companion activities are separate from full digital books.</p>
          </section>

          <div className="membership-plan-grid">
            {plans.map(plan=>(
              <article className={currentPlan?.id===plan.id?"membership-plan-card current":"membership-plan-card"} key={plan.id}>
                <span>{plan.plan_key}</span>
                <h3>{plan.name}</h3>
                <p>{plan.description}</p>
                <p className="settings-note">{plan.plan_key==="premium" ? "Planned paid membership benefits. Enrollment is not open yet." : "Free membership includes selected published resources."}</p>
                <ul className="membership-plan-features">
                  {(planFeatures[plan.plan_key]??[]).map(feature=><li key={feature}>{feature}</li>)}
                </ul>
                <strong>{price(plan.monthly_price_cents,"mo")}</strong>
                {plan.annual_price_cents!==null&&plan.annual_price_cents>0&&<small>{price(plan.annual_price_cents,"yr")}</small>}
                {currentPlan?.id===plan.id?(
                  <div className="status-chip done">Current Plan</div>
                ):(
                  <button className="secondary-button" disabled>{plan.plan_key==="premium" ? "Paid Enrollment Coming Soon" : "Plan Changes Unavailable"}</button>
                )}
              </article>
            ))}
          </div>
          <p className="settings-note">There are two membership levels: Free and a planned paid monthly membership. Final public names, pricing, and checkout remain pending approval. Planned benefits are not a promise that every resource is available in this Alpha.</p>
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
              <button type="button" className="preference-row" key={key} disabled={working} aria-pressed={!!preferences[key as keyof Preference]} onClick={()=>toggle(key as keyof Preference)}>
                <span>{label}</span>
                <strong>{preferences[key as keyof Preference]?"On":"Off"}</strong>
              </button>
            ))}
          </div>
          <div className="quiet-hours-settings">
            <div>
              <p className="eyebrow gold">Quiet Hours</p>
              <p className="muted">Queued email and push delivery waits until quiet hours end. In-app notifications remain available.</p>
            </div>
            <label>
              Quiet Starts
              <input
                type="time"
                disabled={working}
                value={preferences.quiet_hours_start?.slice(0,5) ?? ""}
                onChange={e=>setPreferences(current=>({...current,quiet_hours_start:e.target.value||null}))}
              />
            </label>
            <label>
              Quiet Ends
              <input
                type="time"
                disabled={working}
                value={preferences.quiet_hours_end?.slice(0,5) ?? ""}
                onChange={e=>setPreferences(current=>({...current,quiet_hours_end:e.target.value||null}))}
              />
            </label>
            <label>
              Notification Timezone
              <input
                disabled={working}
                value={preferences.timezone}
                onChange={e=>setPreferences(current=>({...current,timezone:e.target.value}))}
              />
            </label>
          </div>
          <button className="primary-button compact" disabled={working} onClick={()=>void savePreferences()}>Save Preferences</button>
        </section>
      )}

      {tab==="household"&&(
        <div className="settings-stack">
          <FamilyRelationshipSettings key={user.id} user={user} />
          <section className="settings-card">
            <p className="eyebrow gold">Family Hub</p>
            <h2>Household Settings</h2>
            <form className="form-stack" onSubmit={saveHousehold}>
              <label>Family Hub Name<input disabled={working} required value={name} onChange={e=>setName(e.target.value)}/></label>
              <label>Timezone<input disabled={working} required value={householdTimezone} onChange={e=>setHouseholdTimezone(e.target.value)}/></label>
              <button className="primary-button" disabled={working}>Save Household</button>
            </form>
          </section>

          <section className="settings-card">
            <div className="section-heading compact-heading">
              <div>
                <p className="eyebrow red">Approved Adults</p>
                <h2>Family Access</h2>
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
                Adult Email
                <input disabled={working} required type="email" value={inviteEmail} onChange={e=>setInviteEmail(e.target.value)} placeholder="parent@example.com"/>
              </label>
              <label>
                Role
                <select disabled={working} value={inviteRole} onChange={e=>setInviteRole(e.target.value)}>
                  <option value="parent">Parent</option>
                  <option value="guardian">Guardian</option>
                  <option value="adult">Approved Adult</option>
                </select>
              </label>
              <button className="secondary-button" disabled={working}>Create Invite Link</button>
            </form>

            {inviteLink&&(
              <div className="invite-link-box">
                <span>Secure Invite Link</span>
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
                    <button className="text-button small" type="button" disabled={working} onClick={()=>void revokeInvitation(invite.id)}>Revoke</button>
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
          <h2>Change Guardian PIN</h2>
          <p className="muted">The PIN protects Family Hub and parent controls when the device is handed to a child.</p>
          <form className="form-stack" onSubmit={savePin}>
            <label>New PIN<input disabled={working} required type="password" inputMode="numeric" maxLength={6} value={pin} onChange={e=>setPin(e.target.value.replace(/\D/g,"").slice(0,6))}/></label>
            <label>Confirm PIN<input disabled={working} required type="password" inputMode="numeric" maxLength={6} value={confirmPin} onChange={e=>setConfirmPin(e.target.value.replace(/\D/g,"").slice(0,6))}/></label>
            <button className="primary-button" disabled={working}>Update Guardian PIN</button>
          </form>
        </section>
      )}
    </section>
  );
}
