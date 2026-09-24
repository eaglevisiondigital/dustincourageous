import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "./lib/supabase";
import { ChallengeDialog } from "./components/ChallengeDialog";
import { RewardsPanel } from "./components/RewardsPanel";
import { NotificationsPanel } from "./components/NotificationsPanel";
import { AdminPortal } from "./components/AdminPortal";
import { GuardianPinSetup, GuardianUnlockDialog } from "./components/GuardianPin";
import { TrophyRoom } from "./components/TrophyRoom";
import { BibleHub } from "./components/BibleHub";
import { Bookshelf } from "./components/Bookshelf";
import { ParentChildProgress } from "./components/ParentChildProgress";
import { FamilySettings } from "./components/FamilySettings";
import { ActivitiesHub } from "./components/ActivitiesHub";
import { InviteAccept } from "./components/InviteAccept";

type Household = {
  id: string;
  name: string;
  timezone: string;
  status: string;
};

type Child = {
  id: string;
  household_id: string;
  display_name: string;
  birth_year: number | null;
  avatar_key: string | null;
};

type HouseholdMembershipRow = {
  household_id: string;
  role: string;
  households: Household | Household[] | null;
};

type Challenge = {
  id: string;
  title: string;
  description: string | null;
  challenge_type: string;
  xp_reward: number;
  access_level: string;
  parent_approval_required: boolean;
};

type ChildSnapshot = {
  xp: number;
  badges: number;
  weeklyStars: number;
  streak: number;
  completedChallenges: number;
};

const shieldUrl = "https://dustincourageous.com/assets/images/dc-shield.jpeg";

function Brand() {
  return (
    <div className="brand">
      <img src={shieldUrl} alt="Dustin Courageous DC Shield" />
      <div>
        <strong>Dustin Courageous</strong>
        <span>Adventure Club</span>
      </div>
    </div>
  );
}

function LoadingScreen() {
  return (
    <main className="loading-screen">
      <Brand />
      <div className="loader" aria-label="Loading" />
      <p>Preparing your adventure...</p>
    </main>
  );
}

function AuthScreen() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setWorking(true);
    setMessage("");

    const result =
      mode === "signup"
        ? await supabase.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo: window.location.origin + window.location.pathname + window.location.search,
              data: {
                first_name: firstName.trim(),
                display_name: firstName.trim()
              }
            }
          })
        : await supabase.auth.signInWithPassword({ email, password });

    setWorking(false);

    if (result.error) {
      setMessage(result.error.message);
      return;
    }

    if (result.data.session) {
      localStorage.removeItem("dc_adventure_club_kid_locked");
    }

    if (mode === "signup" && !result.data.session) {
      setMessage("Check your email to confirm your guardian account, then come back and sign in.");
    }
  }

  return (
    <main className="auth-layout">
      <section className="auth-story">
        <div className="story-overlay" />
        <div className="story-content">
          <Brand />
          <p className="eyebrow">Faith. Courage. Victory.</p>
          <h1>Big adventures begin with knowing who you are in Christ.</h1>
          <p>
            A guardian-controlled family experience where kids grow in faith, take on courageous
            challenges, learn God's Word, earn rewards, and keep moving forward.
          </p>
          <div className="trust-row">
            <span>Guardian controlled</span>
            <span>No child email required</span>
            <span>Family first</span>
          </div>
        </div>
      </section>

      <section className="auth-panel">
        <div className="auth-card">
          <p className="eyebrow red">Adventure Club Family Access</p>
          <h2>{mode === "signin" ? "Welcome back" : "Create your family account"}</h2>
          <p className="muted">
            Parents and guardians manage the account. Children participate through protected family profiles.
          </p>

          <form onSubmit={submit} className="form-stack">
            {mode === "signup" && (
              <label>
                Parent or guardian first name
                <input
                  required
                  autoComplete="given-name"
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                />
              </label>
            )}
            <label>
              Email
              <input
                required
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
            <label>
              Password
              <input
                required
                minLength={8}
                type="password"
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>

            {message && <div className="form-message">{message}</div>}

            <button className="primary-button" disabled={working} type="submit">
              {working ? "Working..." : mode === "signin" ? "Sign in" : "Create family account"}
            </button>
          </form>

          <button
            type="button"
            className="text-button"
            onClick={() => {
              setMode(mode === "signin" ? "signup" : "signin");
              setMessage("");
            }}
          >
            {mode === "signin" ? "New family? Create an account" : "Already have an account? Sign in"}
          </button>

          <p className="privacy-note">
            Dustin Courageous does not require children to create email accounts. Family access is controlled
            by a parent or guardian.
          </p>
        </div>
      </section>
    </main>
  );
}

function HouseholdSetup({ user, onComplete }: { user: User; onComplete: () => Promise<void> }) {
  const defaultName = user.user_metadata?.last_name ? `${user.user_metadata.last_name} Family` : "My Family";
  const [name, setName] = useState(defaultName);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setWorking(true);
    setError("");

    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Chicago";
    const { error: createError } = await supabase.from("households").insert({
      name: name.trim(),
      created_by: user.id,
      timezone
    });

    if (createError) {
      setError(createError.message);
      setWorking(false);
      return;
    }

    await onComplete();
    setWorking(false);
  }

  return (
    <main className="setup-page">
      <div className="setup-card">
        <Brand />
        <p className="eyebrow red">Step 1 of 2</p>
        <h1>Create your family hub</h1>
        <p className="muted">
          Your household keeps every child's progress, badges, adventures, rewards, and membership access together.
        </p>

        <form onSubmit={submit} className="form-stack">
          <label>
            Family hub name
            <input required value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          {error && <div className="form-message">{error}</div>}
          <button className="primary-button" disabled={working}>
            {working ? "Creating..." : "Create family hub"}
          </button>
        </form>
      </div>
    </main>
  );
}

function AddChildForm({
  household,
  user,
  onAdded,
  compact = false
}: {
  household: Household;
  user: User;
  onAdded: () => Promise<void>;
  compact?: boolean;
}) {
  const [name, setName] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setWorking(true);
    setError("");

    const parsedYear = birthYear ? Number(birthYear) : null;
    const { error: childError } = await supabase.from("child_profiles").insert({
      household_id: household.id,
      display_name: name.trim(),
      birth_year: parsedYear,
      created_by: user.id
    });

    if (childError) {
      setError(childError.message);
      setWorking(false);
      return;
    }

    setName("");
    setBirthYear("");
    await onAdded();
    setWorking(false);
  }

  return (
    <form className={compact ? "child-form compact" : "child-form"} onSubmit={submit}>
      <div>
        <label>
          Child's first name or nickname
          <input required value={name} onChange={(event) => setName(event.target.value)} />
        </label>
      </div>
      <div>
        <label>
          Birth year <span className="optional">(optional)</span>
          <input
            type="number"
            min="2008"
            max={new Date().getFullYear()}
            inputMode="numeric"
            value={birthYear}
            onChange={(event) => setBirthYear(event.target.value)}
          />
        </label>
      </div>
      {error && <div className="form-message">{error}</div>}
      <button className="secondary-button" disabled={working}>
        {working ? "Adding..." : "Add child profile"}
      </button>
    </form>
  );
}

function EmptyFamily({
  household,
  user,
  onAdded
}: {
  household: Household;
  user: User;
  onAdded: () => Promise<void>;
}) {
  return (
    <main className="setup-page">
      <div className="setup-card wide">
        <Brand />
        <p className="eyebrow red">Step 2 of 2</p>
        <h1>Add your first adventurer</h1>
        <p className="muted">
          Children do not need an email address or separate internet account. You create and manage their protected profile.
        </p>
        <AddChildForm household={household} user={user} onAdded={onAdded} />
      </div>
    </main>
  );
}

function FamilyPortal({
  user,
  household,
  children,
  reload,
  adminRole,
  onAdmin
}: {
  user: User;
  household: Household;
  children: Child[];
  reload: () => Promise<void>;
  adminRole: string | null;
  onAdmin: () => void;
}) {
  const [selectedChildId, setSelectedChildId] = useState(children[0]?.id ?? "");
  const [snapshot, setSnapshot] = useState<ChildSnapshot>({
    xp: 0,
    badges: 0,
    weeklyStars: 0,
    streak: 0,
    completedChallenges: 0
  });
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [addingChild, setAddingChild] = useState(false);
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);
  const [kidLocked, setKidLocked] = useState(
    () => localStorage.getItem("dc_adventure_club_kid_locked") === "1"
  );
  const [unlockOpen, setUnlockOpen] = useState(false);
  const [view, setView] = useState<"kid" | "parent">(
    () => localStorage.getItem("dc_adventure_club_kid_locked") === "1" ? "kid" : "parent"
  );
  const [kidSection, setKidSection] = useState<"home" | "bible" | "books" | "activities" | "trophies">("home");
  const [parentSection, setParentSection] = useState<"overview" | "settings">("overview");

  const selectedChild = useMemo(
    () => children.find((child) => child.id === selectedChildId) ?? children[0],
    [children, selectedChildId]
  );

  const loadChildDashboard = useCallback(async () => {
    if (!selectedChild) return;

    const [xpResult, badgeResult, activeStreakBadgeResult, tokenResult, streakResult, progressResult, challengeResult] = await Promise.all([
      supabase.from("child_xp_totals").select("total_xp").eq("child_profile_id", selectedChild.id).maybeSingle(),
      supabase.from("badge_awards").select("id", { count: "exact", head: true }).eq("child_profile_id", selectedChild.id),
      supabase
        .from("child_active_streak_badges")
        .select("badge_id", { count: "exact", head: true })
        .eq("child_profile_id", selectedChild.id)
        .eq("is_active", true),
      supabase
        .from("child_token_totals")
        .select("total")
        .eq("child_profile_id", selectedChild.id)
        .eq("token_type", "weekly_star")
        .maybeSingle(),
      supabase
        .from("child_streaks")
        .select("current_count")
        .eq("child_profile_id", selectedChild.id)
        .eq("streak_key", "challenge_completion")
        .maybeSingle(),
      supabase
        .from("child_challenge_progress")
        .select("id", { count: "exact", head: true })
        .eq("child_profile_id", selectedChild.id)
        .eq("status", "completed"),
      supabase
        .from("challenges")
        .select("id,title,description,challenge_type,xp_reward,access_level,parent_approval_required")
        .eq("status", "published")
        .order("is_featured", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(6)
    ]);

    setSnapshot({
      xp: Number(xpResult.data?.total_xp ?? 0),
      badges: (badgeResult.count ?? 0) + (activeStreakBadgeResult.count ?? 0),
      weeklyStars: Number(tokenResult.data?.total ?? 0),
      streak: streakResult.data?.current_count ?? 0,
      completedChallenges: progressResult.count ?? 0
    });
    setChallenges((challengeResult.data ?? []) as Challenge[]);
  }, [selectedChild]);

  useEffect(() => {
    void loadChildDashboard();
  }, [loadChildDashboard]);

  async function openChallengeById(challengeId: string) {
    const existing = challenges.find((challenge) => challenge.id === challengeId);
    if (existing) {
      setSelectedChallenge(existing);
      return;
    }

    const { data, error: challengeError } = await supabase
      .from("challenges")
      .select("id,title,description,challenge_type,xp_reward,access_level,parent_approval_required")
      .eq("id", challengeId)
      .single();

    if (!challengeError && data) {
      setSelectedChallenge(data as Challenge);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <Brand />
        <div className="header-actions">
          {kidLocked ? (
            <>
              <span className="kid-lock-status">Kid View Locked</span>
              <button className="mode active" onClick={() => setUnlockOpen(true)}>
                Unlock Family Hub
              </button>
            </>
          ) : (
            <>
              <button
                className={view === "kid" ? "mode active" : "mode"}
                onClick={() => {
                  localStorage.setItem("dc_adventure_club_kid_locked", "1");
                  setKidLocked(true);
                  setView("kid");
                }}
              >
                Lock Kid View
              </button>
              <button className={view === "parent" ? "mode active" : "mode"} onClick={() => setView("parent")}>
                Family hub
              </button>
              {adminRole && (
                <button className="text-button small" onClick={onAdmin}>
                  Admin
                </button>
              )}
              <button className="text-button small" onClick={signOut}>
                Sign out
              </button>
            </>
          )}
        </div>
      </header>

      <div className="app-body">
        <aside className="side-panel">
          <p className="eyebrow">Your Adventurers</p>
          <div className="children-list">
            {children.map((child) => (
              <button
                key={child.id}
                className={selectedChild?.id === child.id ? "child-switcher active" : "child-switcher"}
                onClick={() => setSelectedChildId(child.id)}
              >
                <span className="avatar">{child.display_name.slice(0, 1).toUpperCase()}</span>
                <span>{child.display_name}</span>
              </button>
            ))}
          </div>
          <button className="add-link" onClick={() => setAddingChild((value) => !value)}>
            + Add another child
          </button>
          {addingChild && (
            <div className="side-form">
              <AddChildForm
                compact
                household={household}
                user={user}
                onAdded={async () => {
                  await reload();
                  setAddingChild(false);
                }}
              />
            </div>
          )}
        </aside>

        <main className="portal-main">
          {view === "kid" ? (
            <>
              <nav className="kid-subnav" aria-label="Kid area">
                <button
                  type="button"
                  className={kidSection === "home" ? "kid-subnav-button active" : "kid-subnav-button"}
                  onClick={() => setKidSection("home")}
                >
                  Home
                </button>
                <button
                  type="button"
                  className={kidSection === "bible" ? "kid-subnav-button active" : "kid-subnav-button"}
                  onClick={() => setKidSection("bible")}
                >
                  Bible
                </button>
                <button
                  type="button"
                  className={kidSection === "books" ? "kid-subnav-button active" : "kid-subnav-button"}
                  onClick={() => setKidSection("books")}
                >
                  Books
                </button>
                <button
                  type="button"
                  className={kidSection === "activities" ? "kid-subnav-button active" : "kid-subnav-button"}
                  onClick={() => setKidSection("activities")}
                >
                  Activities
                </button>
                <button
                  type="button"
                  className={kidSection === "trophies" ? "kid-subnav-button active" : "kid-subnav-button"
                  onClick={() => setKidSection("trophies")}
                >
                  Trophy Room
                </button>
              </nav>

              {kidSection === "trophies" && selectedChild ? (
                <TrophyRoom childId={selectedChild.id} childName={selectedChild.display_name} />
              ) : kidSection === "bible" && selectedChild ? (
                <BibleHub
                  childId={selectedChild.id}
                  childName={selectedChild.display_name}
                  onProgress={loadChildDashboard}
                />
              ) : kidSection === "books" && selectedChild ? (
                <Bookshelf
                  childId={selectedChild.id}
                  childName={selectedChild.display_name}
                  onProgress={loadChildDashboard}
                  onOpenChallenge={(challengeId) => void openChallengeById(challengeId)}
                />
              ) : kidSection === "activities" && selectedChild ? (
                <ActivitiesHub
                  childId={selectedChild.id}
                  childName={selectedChild.display_name}
                  onProgress={loadChildDashboard}
                />
              ) : (
                <>
              <section className="welcome-card">
                <div>
                  <p className="eyebrow gold">Adventure Club</p>
                  <h1>Hey, {selectedChild?.display_name}!</h1>
                  <p>Ready to grow stronger in faith and courage today?</p>
                </div>
                <img src={shieldUrl} alt="" />
              </section>

              <section className="stats-grid five-up">
                <article><strong>{snapshot.xp}</strong><span>XP earned</span></article>
                <article><strong>{snapshot.weeklyStars}</strong><span>Weekly stars</span></article>
                <article><strong>{snapshot.badges}</strong><span>Badges</span></article>
                <article><strong>{snapshot.streak}</strong><span>Day streak</span></article>
                <article><strong>{snapshot.completedChallenges}</strong><span>Challenges won</span></article>
              </section>

              <section className="section-block">
                <div className="section-heading">
                  <div>
                    <p className="eyebrow red">Keep Going</p>
                    <h2>Today's adventures</h2>
                  </div>
                  <span className="pill">Fresh challenges appear here</span>
                </div>

                {challenges.length ? (
                  <div className="challenge-grid">
                    {challenges.map((challenge) => (
                      <article className="challenge-card" key={challenge.id}>
                        <div className="challenge-top">
                          <span className="challenge-type">{challenge.challenge_type.replaceAll("_", " ")}</span>
                          <span className="xp-chip">+{challenge.xp_reward} XP</span>
                        </div>
                        <h3>{challenge.title}</h3>
                        <p>{challenge.description || "A new courage challenge is ready for you."}</p>
                        <button className="secondary-button" type="button" onClick={() => setSelectedChallenge(challenge)}>Open challenge</button>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">
                    <div className="empty-icon">★</div>
                    <h3>Your Adventure Club is ready.</h3>
                    <p>
                      Once challenges are published from the Courageous Kids admin area, they will appear here automatically.
                    </p>
                  </div>
                )}
              </section>

              <section className="identity-banner">
                <p className="eyebrow gold">Identity Connection</p>
                <h2>You can be courageous because God is with you.</h2>
                <p>Learn it. Say it. Live it. Give it away.</p>
              </section>
                </>
              )}
            </>
          ) : (
            <>
              <nav className="kid-subnav" aria-label="Family Hub area">
                <button
                  type="button"
                  className={parentSection === "overview" ? "kid-subnav-button active" : "kid-subnav-button"}
                  onClick={() => setParentSection("overview")}
                >
                  Family Overview
                </button>
                <button
                  type="button"
                  className={parentSection === "settings" ? "kid-subnav-button active" : "kid-subnav-button"}
                  onClick={() => setParentSection("settings")}
                >
                  Membership & Settings
                </button>
              </nav>

              {parentSection === "settings" ? (
                <FamilySettings
                  user={user}
                  householdId={household.id}
                  householdName={household.name}
                  timezone={household.timezone}
                  onHouseholdUpdated={reload}
                />
              ) : (
                <>
              <section className="parent-hero">
                <div>
                  <p className="eyebrow red">Family Hub</p>
                  <h1>{household.name}</h1>
                  <p>See progress, manage profiles, approve rewards, and help your kids keep growing.</p>
                </div>
                <div className="household-badge">Guardian controlled</div>
              </section>

              <section className="family-grid">
                {children.map((child) => (
                  <article className="family-child-card" key={child.id}>
                    <div className="avatar large">{child.display_name.slice(0, 1).toUpperCase()}</div>
                    <div>
                      <h3>{child.display_name}</h3>
                      <p>{child.birth_year ? `Birth year ${child.birth_year}` : "Protected child profile"}</p>
                    </div>
                    <button
                      className="text-button small"
                      onClick={() => {
                        setSelectedChildId(child.id);
                        setKidSection("home");
                        setView("kid");
                      }}
                    >
                      View adventure
                    </button>
                  </article>
                ))}
              </section>

              <section className="parent-modules">
                <article><span>Progress</span><strong>See XP, streaks, badges, and completed challenges.</strong></article>
                <article><span>Rewards</span><strong>Review and approve rewards your kids unlock.</strong></article>
                <article><span>Faith at Home</span><strong>Family devotionals and discussion guides will live here.</strong></article>
                <article><span>Membership</span><strong>Manage Adventure Club access for the whole household.</strong></article>
              </section>

              {selectedChild && (
                <>
                  <ParentChildProgress childId={selectedChild.id} childName={selectedChild.display_name} />
                  <div className="family-detail-grid">
                    <RewardsPanel childId={selectedChild.id} userId={user.id} />
                    <NotificationsPanel userId={user.id} />
                  </div>
                </>
              )}
                </>
              )}
            </>
          )}
        </main>
      </div>

      {selectedChallenge && selectedChild && (
        <ChallengeDialog
          challenge={selectedChallenge}
          childId={selectedChild.id}
          onClose={() => setSelectedChallenge(null)}
          onCompleted={async () => {
            await loadChildDashboard();
          }}
        />
      )}

      {unlockOpen && (
        <GuardianUnlockDialog
          householdId={household.id}
          onClose={() => setUnlockOpen(false)}
          onUnlock={() => {
            localStorage.removeItem("dc_adventure_club_kid_locked");
            setKidLocked(false);
            setUnlockOpen(false);
            setView("parent");
          }}
          onSignOut={async () => {
            await supabase.auth.signOut();
          }}
        />
      )}
    </div>
  );
}

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [household, setHousehold] = useState<Household | null>(null);
  const [children, setChildren] = useState<Child[]>([]);
  const [adminRole, setAdminRole] = useState<string | null>(null);
  const [guardianPinConfigured, setGuardianPinConfigured] = useState<boolean | null>(null);

  const loadFamily = useCallback(async (user: User) => {
    const { data: adminData, error: adminError } = await supabase
      .from("app_admins")
      .select("role,status")
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();

    if (adminError) throw adminError;
    setAdminRole(adminData?.role ?? null);
    const { data: membershipData, error: membershipError } = await supabase
      .from("household_members")
      .select("household_id,role,households(id,name,timezone,status)")
      .eq("user_id", user.id)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();

    if (membershipError) throw membershipError;

    const membership = membershipData as HouseholdMembershipRow | null;
    const joined = membership?.households;
    const currentHousehold = Array.isArray(joined) ? joined[0] : joined;

    if (!currentHousehold) {
      setHousehold(null);
      setChildren([]);
      setGuardianPinConfigured(null);
      return;
    }

    setHousehold(currentHousehold);

    const [childResult, pinResult] = await Promise.all([
      supabase
        .from("child_profiles")
        .select("id,household_id,display_name,birth_year,avatar_key")
        .eq("household_id", currentHousehold.id)
        .eq("status", "active")
        .order("created_at", { ascending: true }),
      supabase.rpc("guardian_pin_status", {
        p_household_id: currentHousehold.id
      })
    ]);

    if (childResult.error) throw childResult.error;
    if (pinResult.error) throw pinResult.error;

    setChildren((childResult.data ?? []) as Child[]);
    setGuardianPinConfigured(pinResult.data?.[0]?.configured ?? false);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      if (data.session?.user) {
        try {
          await loadFamily(data.session.user);
        } catch (error) {
          console.error("Unable to load account", error);
        }
      }
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);

      if (!nextSession) {
        setHousehold(null);
        setChildren([]);
        setAdminRole(null);
        setGuardianPinConfigured(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      void loadFamily(nextSession.user)
        .catch((error) => console.error("Unable to load account", error))
        .finally(() => setLoading(false));
    });

    return () => listener.subscription.unsubscribe();
  }, [loadFamily]);

  if (loading) return <LoadingScreen />;
  if (!session?.user) return <AuthScreen />;

  if (location.pathname.startsWith("/invite")) {
    const params = new URLSearchParams(location.search);
    const invitationId = params.get("id");
    const token = params.get("token");

    if (!invitationId || !token) {
      return (
        <main className="setup-page">
          <div className="setup-card">
            <Brand />
            <p className="eyebrow red">Invitation</p>
            <h1>Invalid invitation link</h1>
            <p className="muted">This family invitation link is incomplete.</p>
            <button className="secondary-button" onClick={() => navigate("/")}>Return to Adventure Club</button>
          </div>
        </main>
      );
    }

    return (
      <InviteAccept
        invitationId={invitationId}
        token={token}
        onAccepted={async () => {
          await loadFamily(session.user);
          navigate("/");
        }}
      />
    );
  }

  if (location.pathname.startsWith("/admin")) {
    if (!adminRole) {
      return (
        <main className="setup-page">
          <div className="setup-card">
            <Brand />
            <p className="eyebrow red">Restricted Area</p>
            <h1>Admin access required</h1>
            <p className="muted">This account is not currently assigned an Adventure Club admin role.</p>
            <button className="secondary-button" onClick={() => navigate("/")}>Return to family area</button>
          </div>
        </main>
      );
    }

    return <AdminPortal user={session.user} role={adminRole} onExit={() => navigate("/")} />;
  }

  if (!household) {
    return <HouseholdSetup user={session.user} onComplete={() => loadFamily(session.user)} />;
  }

  if (!children.length) {
    return <EmptyFamily household={household} user={session.user} onAdded={() => loadFamily(session.user)} />;
  }

  if (guardianPinConfigured === false) {
    return (
      <GuardianPinSetup
        householdId={household.id}
        onComplete={() => setGuardianPinConfigured(true)}
      />
    );
  }

  return (
    <FamilyPortal
      user={session.user}
      household={household}
      children={children}
      reload={() => loadFamily(session.user)}
      adminRole={adminRole}
      onAdmin={() => navigate("/admin")}
    />
  );
}
