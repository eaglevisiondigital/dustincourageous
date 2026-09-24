import { FormEvent, lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "./lib/supabase";
import { registerCurrentInstallation } from "./lib/installations";
import { readChildDashboard, type ChildSnapshot } from "./lib/childDashboard";

const AdminPortal = lazy(() =>
  import("./components/AdminPortal").then((module) => ({ default: module.AdminPortal }))
);
const ChallengeDialog = lazy(() => import("./components/ChallengeDialog").then((module) => ({ default: module.ChallengeDialog })));
const RewardsPanel = lazy(() => import("./components/RewardsPanel").then((module) => ({ default: module.RewardsPanel })));
const NotificationsPanel = lazy(() => import("./components/NotificationsPanel").then((module) => ({ default: module.NotificationsPanel })));
const InviteAccept = lazy(() => import("./components/InviteAccept").then((module) => ({ default: module.InviteAccept })));
const OrganizationInviteAccept = lazy(() => import("./components/OrganizationInviteAccept").then((module) => ({ default: module.OrganizationInviteAccept })));
const LeaderOnlyPortal = lazy(() => import("./components/LeaderOnlyPortal").then((module) => ({ default: module.LeaderOnlyPortal })));
const KidHomeFocus = lazy(() => import("./components/KidHomeFocus").then((module) => ({ default: module.KidHomeFocus })));
const GuardianPinSetup = lazy(() => import("./components/GuardianPin").then((module) => ({ default: module.GuardianPinSetup })));
const GuardianUnlockDialog = lazy(() => import("./components/GuardianPin").then((module) => ({ default: module.GuardianUnlockDialog })));
const TrophyRoom = lazy(() => import("./components/TrophyRoom").then((module) => ({ default: module.TrophyRoom })));
const BibleHub = lazy(() => import("./components/BibleHub").then((module) => ({ default: module.BibleHub })));
const Bookshelf = lazy(() => import("./components/Bookshelf").then((module) => ({ default: module.Bookshelf })));
const ActivitiesHub = lazy(() => import("./components/ActivitiesHub").then((module) => ({ default: module.ActivitiesHub })));
const FamilyStore = lazy(() => import("./components/FamilyStore").then((module) => ({ default: module.FamilyStore })));
const ParentApprovals = lazy(() => import("./components/ParentApprovals").then((module) => ({ default: module.ParentApprovals })));
const ParentProgressOverview = lazy(() => import("./components/ParentProgressOverview").then((module) => ({ default: module.ParentProgressOverview })));
const FamilyFaithAtHome = lazy(() => import("./components/FamilyFaithAtHome").then((module) => ({ default: module.FamilyFaithAtHome })));
const FamilyGroupsCard = lazy(() => import("./components/FamilyGroupsCard").then((module) => ({ default: module.FamilyGroupsCard })));
const FamilyEventsCard = lazy(() => import("./components/FamilyEventsCard").then((module) => ({ default: module.FamilyEventsCard })));
const ParentChildProgress = lazy(() => import("./components/ParentChildProgress").then((module) => ({ default: module.ParentChildProgress })));
const MembershipAccessCard = lazy(() => import("./components/MembershipAccessCard").then((module) => ({ default: module.MembershipAccessCard })));
const OrderHistoryCard = lazy(() => import("./components/OrderHistoryCard").then((module) => ({ default: module.OrderHistoryCard })));
const LeaderGroupsHub = lazy(() => import("./components/LeaderGroupsHub").then((module) => ({ default: module.LeaderGroupsHub })));
const ReferralSupportCard = lazy(() => import("./components/ReferralSupportCard").then((module) => ({ default: module.ReferralSupportCard })));
const PrivacyDataControls = lazy(() => import("./components/PrivacyDataControls").then((module) => ({ default: module.PrivacyDataControls })));
const FamilySettings = lazy(() => import("./components/FamilySettings").then((module) => ({ default: module.FamilySettings })));

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

function AuthScreen({ initialMessage = "" }: { initialMessage?: string }) {
  const leaderInvitation = window.location.pathname.startsWith("/org-invite");
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState(initialMessage);
  const [confirmationPending, setConfirmationPending] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setWorking(true);
    setMessage("");

    if (mode === "forgot") {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + "/"
      });
      setWorking(false);
      setMessage(
        error
          ? error.message
          : "If an Adventure Club account uses that email, a secure password reset link is on its way."
      );
      return;
    }

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
      setConfirmationPending(true);
    }
  }

  async function resendConfirmation() {
    if (!email) return;
    setWorking(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: window.location.origin + "/" }
    });
    setWorking(false);
    setMessage(error ? error.message : "A new confirmation email has been requested. Please check your inbox and spam folder.");
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
          <p className="eyebrow red">
            {leaderInvitation ? "Adventure Club Adult Access" : "Adventure Club Family Access"}
          </p>
          <h2>
            {mode === "forgot"
              ? "Reset your password"
              : mode === "signin"
              ? "Welcome back"
              : leaderInvitation
                ? "Create your adult account"
                : "Create your family account"}
          </h2>
          <p className="muted">
            {mode === "forgot"
              ? "Enter the adult account email. We will send a secure link if the account exists."
              : leaderInvitation
              ? "Use the exact email address that received the organization invitation. Leader access does not require a child or family household."
              : "Parents and guardians manage the account. Children participate through protected family profiles."}
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
            {mode !== "forgot" && (
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
            )}

            {message && <div className="form-message">{message}</div>}

            <button className="primary-button" disabled={working} type="submit">
              {working ? "Working..." : mode === "forgot" ? "Send secure reset link" : mode === "signin" ? "Sign in" : "Create family account"}
            </button>
            {confirmationPending && (
              <button className="secondary-button" disabled={working} type="button" onClick={() => void resendConfirmation()}>
                Resend confirmation email
              </button>
            )}
          </form>

          <div className="auth-link-row">
            <button
              type="button"
              className="text-button"
              onClick={() => {
                setMode(mode === "signin" ? "signup" : "signin");
                setMessage("");
                setConfirmationPending(false);
              }}
            >
              {mode === "signin" ? "New family? Create an account" : "Back to sign in"}
            </button>
            {mode === "signin" && (
              <button type="button" className="text-button" onClick={() => { setMode("forgot"); setMessage(""); }}>
                Forgot password?
              </button>
            )}
          </div>

          <p className="privacy-note">
            Dustin Courageous does not require children to create email accounts. Family access is controlled
            by a parent or guardian.
          </p>
        </div>
      </section>
    </main>
  );
}

function ResetPasswordScreen({ onComplete }: { onComplete: () => void }) {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    if (password.length < 8) {
      setMessage("Choose a password with at least 8 characters.");
      return;
    }
    if (password !== confirmation) {
      setMessage("The passwords do not match.");
      return;
    }

    setWorking(true);
    const { error } = await supabase.auth.updateUser({ password });
    setWorking(false);
    if (error) {
      setMessage(error.message);
      return;
    }

    onComplete();
  }

  return (
    <main className="setup-page">
      <div className="setup-card">
        <Brand />
        <p className="eyebrow red">Guardian Account</p>
        <h1>Choose a new password</h1>
        <p className="muted">This updates the password for the adult Adventure Club account.</p>
        <form className="form-stack" onSubmit={submit}>
          <label>
            New password
            <input required minLength={8} type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </label>
          <label>
            Confirm new password
            <input required minLength={8} type="password" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} />
          </label>
          {message && <div className="form-message">{message}</div>}
          <button className="primary-button" disabled={working}>
            {working ? "Updating..." : "Update password"}
          </button>
        </form>
      </div>
    </main>
  );
}

function HouseholdSetup({ user, onComplete }: { user: User; onComplete: () => Promise<void> }) {
  const defaultName = user.user_metadata?.last_name ? `${user.user_metadata.last_name} Family` : "My Family";
  const [name, setName] = useState(defaultName);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setWorking(true);
    setError("");

    if (!acceptedTerms) {
      setError("Please confirm the Guardian Account Terms to create your family hub.");
      setWorking(false);
      return;
    }

    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Chicago";
    const { error: createError } = await supabase.rpc("create_household_with_consent", {
      p_name: name.trim(),
      p_timezone: timezone
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
        <p className="eyebrow red">Step 1 of 3</p>
        <h1>Create your family hub</h1>
        <p className="muted">
          Your household keeps every child's progress, badges, adventures, rewards, and membership access together.
        </p>

        <form onSubmit={submit} className="form-stack">
          <label>
            Family hub name
            <input required value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          <label className="onboarding-consent">
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(event) => setAcceptedTerms(event.target.checked)}
            />
            <span>
              I am the parent/guardian account holder and agree to the current Guardian Account Terms for this family hub.
            </span>
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
  const [guardianConsent, setGuardianConsent] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setWorking(true);
    setError("");

    if (!guardianConsent) {
      setError("Please confirm guardian approval for this child to participate in Adventure Club.");
      setWorking(false);
      return;
    }

    const parsedYear = birthYear ? Number(birthYear) : undefined;
    const { error: childError } = await supabase.rpc("create_child_with_consent", {
      p_household_id: household.id,
      p_display_name: name.trim(),
      p_birth_year: parsedYear
    });

    if (childError) {
      setError(childError.message);
      setWorking(false);
      return;
    }

    setName("");
    setBirthYear("");
    setGuardianConsent(false);
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
      <label className="child-consent">
        <input
          type="checkbox"
          checked={guardianConsent}
          onChange={(event) => setGuardianConsent(event.target.checked)}
        />
        <span>
          I am the parent/guardian and approve this protected child profile for Adventure Club participation.
        </span>
      </label>
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
        <p className="eyebrow red">Step 2 of 3</p>
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
  const [dashboardChildId, setDashboardChildId] = useState("");
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState("");
  const dashboardVersion = useRef(0);
  const challengeRequestVersion = useRef(0);
  const [challengeError, setChallengeError] = useState("");
  const [addingChild, setAddingChild] = useState(false);
  const [selectedChallenge, setSelectedChallenge] = useState<{ childId: string; challenge: Challenge } | null>(null);
  const [kidLocked, setKidLocked] = useState(
    () => localStorage.getItem("dc_adventure_club_kid_locked") === "1"
  );
  const [unlockOpen, setUnlockOpen] = useState(false);
  const [view, setView] = useState<"kid" | "parent">(
    () => localStorage.getItem("dc_adventure_club_kid_locked") === "1" ? "kid" : "parent"
  );
  const [kidSection, setKidSection] = useState<"home" | "bible" | "books" | "activities" | "trophies">("home");
  const [parentSection, setParentSection] = useState<"overview" | "faith" | "groups" | "events" | "store" | "settings">(
    () => ["success", "canceled"].includes(new URLSearchParams(window.location.search).get("checkout") ?? "")
      ? "store" : "overview"
  );

  const selectedChild = useMemo(
    () => children.find((child) => child.id === selectedChildId) ?? children[0],
    [children, selectedChildId]
  );
  const currentChildId = useRef(selectedChild?.id);
  currentChildId.current = selectedChild?.id;

  function selectChild(childId: string) {
    if (childId === currentChildId.current) return;
    challengeRequestVersion.current += 1;
    dashboardVersion.current += 1;
    currentChildId.current = childId;
    setSelectedChallenge(null);
    setChallengeError("");
    setDashboardError("");
    setSelectedChildId(childId);
  }

  function showChallenge(challenge: Challenge) {
    if (!selectedChild || currentChildId.current !== selectedChild.id) return;
    challengeRequestVersion.current += 1;
    setChallengeError("");
    setSelectedChallenge({ childId: selectedChild.id, challenge });
  }

  const loadChildDashboard = useCallback(async () => {
    if (!selectedChild || currentChildId.current !== selectedChild.id) return;
    const version = ++dashboardVersion.current;
    setDashboardLoading(true);
    setDashboardError("");
    try {
      const result = await readChildDashboard(supabase, selectedChild.id);
      if (version !== dashboardVersion.current || currentChildId.current !== selectedChild.id) return;
      setSnapshot(result.snapshot);
      setChallenges(result.challenges);
      setDashboardChildId(selectedChild.id);
    } catch {
      if (version === dashboardVersion.current && currentChildId.current === selectedChild.id) {
        setDashboardError("Your progress could not be loaded. Please try again.");
      }
    } finally {
      if (version === dashboardVersion.current && currentChildId.current === selectedChild.id) setDashboardLoading(false);
    }
  }, [selectedChild]);

  useEffect(() => {
    void loadChildDashboard();
    return () => { dashboardVersion.current += 1; challengeRequestVersion.current += 1; };
  }, [loadChildDashboard]);

  async function openChallengeById(challengeId: string) {
    if (!selectedChild || currentChildId.current !== selectedChild.id) return;
    const childId = selectedChild.id;
    const version = ++challengeRequestVersion.current;
    setChallengeError("");
    const existing = dashboardChildId === childId ? challenges.find((challenge) => challenge.id === challengeId) : null;
    if (existing) {
      showChallenge(existing);
      return;
    }

    try {
    const { data, error: challengeError } = await supabase
      .from("challenges")
      .select("id,title,description,challenge_type,xp_reward,access_level,parent_approval_required")
      .eq("id", challengeId)
      .single();

    if (version !== challengeRequestVersion.current || currentChildId.current !== childId) return;
    if (challengeError || !data) throw new Error("Challenge unavailable");
    showChallenge(data as Challenge);
    } catch {
      if (version === challengeRequestVersion.current && currentChildId.current === childId) setChallengeError("This challenge could not be opened. Please try again.");
    }
  }

  async function signOut() {
    sessionStorage.removeItem("dc_guardian_session_token");
    await supabase.auth.signOut();
  }

  async function lockKidView() {
    sessionStorage.removeItem("dc_guardian_session_token");
    await supabase.rpc("revoke_guardian_unlock_sessions", {
      p_household_id: household.id
    });
    localStorage.setItem("dc_adventure_club_kid_locked", "1");
    setKidLocked(true);
    setView("kid");
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
                onClick={() => void lockKidView()}
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
                onClick={() => selectChild(child.id)}
              >
                <span className="avatar">{child.display_name.slice(0, 1).toUpperCase()}</span>
                <span>{child.display_name}</span>
              </button>
            ))}
          </div>
          {view === "parent" && !kidLocked && (
            <button className="add-link" onClick={() => setAddingChild((value) => !value)}>
              + Add another child
            </button>
          )}
          {view === "parent" && !kidLocked && addingChild && (
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
          {challengeError && <p className="form-message" role="alert">{challengeError}</p>}
          <Suspense fallback={<div className="loader" aria-label="Loading section" />}>
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
                  className={kidSection === "trophies" ? "kid-subnav-button active" : "kid-subnav-button"}
                  onClick={() => setKidSection("trophies")}
                >
                  Trophy Room
                </button>
              </nav>

              {kidSection === "trophies" && selectedChild ? (
                <TrophyRoom key={selectedChild.id} childId={selectedChild.id} childName={selectedChild.display_name} />
              ) : kidSection === "bible" && selectedChild ? (
                <BibleHub
                  key={selectedChild.id}
                  childId={selectedChild.id}
                  childName={selectedChild.display_name}
                  onProgress={loadChildDashboard}
                />
              ) : kidSection === "books" && selectedChild ? (
                <Bookshelf
                  key={selectedChild.id}
                  childId={selectedChild.id}
                  childName={selectedChild.display_name}
                  onProgress={loadChildDashboard}
                  onOpenChallenge={(challengeId) => void openChallengeById(challengeId)}
                  onOpenBible={() => setKidSection("bible")}
                  onOpenActivities={() => setKidSection("activities")}
                />
              ) : kidSection === "activities" && selectedChild ? (
                <ActivitiesHub
                  key={selectedChild.id}
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

              {selectedChild && (
                <KidHomeFocus
                  key={selectedChild.id}
                  childId={selectedChild.id}
                  onOpenBooks={() => setKidSection("books")}
                  onOpenBible={() => setKidSection("bible")}
                  onOpenActivities={() => setKidSection("activities")}
                  onOpenChallenge={(challengeId) => void openChallengeById(challengeId)}
                />
              )}

              {dashboardError ? (
                <div className="empty-state"><p role="alert">{dashboardError}</p><button className="secondary-button" onClick={()=>void loadChildDashboard()}>Try again</button></div>
              ) : dashboardLoading || dashboardChildId !== selectedChild?.id ? (
                <p role="status">Loading your progress...</p>
              ) : (<>
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
                        <button className="secondary-button" type="button" onClick={() => showChallenge(challenge)}>Open challenge</button>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">
                    <div className="empty-icon">★</div>
                    <h3>Your Adventure Club is ready.</h3>
                    <p>
                      New adventures are on the way. Explore Bible Basecamp or your Bookshelf while you wait.
                    </p>
                  </div>
                )}
              </section>
              </>)}
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
                  className={parentSection === "faith" ? "kid-subnav-button active" : "kid-subnav-button"}
                  onClick={() => setParentSection("faith")}
                >
                  Family Faith
                </button>
                <button
                  type="button"
                  className={parentSection === "groups" ? "kid-subnav-button active" : "kid-subnav-button"}
                  onClick={() => setParentSection("groups")}
                >
                  Groups
                </button>
                <button
                  type="button"
                  className={parentSection === "events" ? "kid-subnav-button active" : "kid-subnav-button"}
                  onClick={() => setParentSection("events")}
                >
                  Events
                </button>
                <button
                  type="button"
                  className={parentSection === "store" ? "kid-subnav-button active" : "kid-subnav-button"}
                  onClick={() => setParentSection("store")}
                >
                  Store
                </button>
                <button
                  type="button"
                  className={parentSection === "settings" ? "kid-subnav-button active" : "kid-subnav-button"}
                  onClick={() => setParentSection("settings")}
                >
                  Membership & Settings
                </button>
              </nav>

              {parentSection === "store" ? (
                <FamilyStore key={household.id} householdId={household.id} />
              ) : parentSection === "settings" ? (
                <>
                  <MembershipAccessCard householdId={household.id} />
                  <OrderHistoryCard key={household.id} householdId={household.id} />
                  <LeaderGroupsHub />
                  <ReferralSupportCard householdId={household.id} user={user} />
                  <PrivacyDataControls
                    householdId={household.id}
                    user={user}
                    onHouseholdUpdated={reload}
                  />
                  <FamilySettings
                    user={user}
                    householdId={household.id}
                    householdName={household.name}
                    timezone={household.timezone}
                    onHouseholdUpdated={reload}
                  />
                </>
              ) : parentSection === "faith" ? (
                <FamilyFaithAtHome
                  householdId={household.id}
                  user={user}
                  children={children.map((child) => ({ id: child.id, display_name: child.display_name }))}
                  selectedChildId={selectedChild?.id ?? ""}
                />
              ) : parentSection === "groups" ? (
                <FamilyGroupsCard
                  children={children.map((child) => ({ id: child.id, display_name: child.display_name }))}
                  selectedChildId={selectedChild?.id ?? ""}
                  onOpenChallenge={(challengeId) => void openChallengeById(challengeId)}
                />
              ) : parentSection === "events" ? (
                <FamilyEventsCard
                  key={household.id}
                  householdId={household.id}
                  children={children.map((child) => ({ id: child.id, display_name: child.display_name }))}
                  selectedChildId={selectedChild?.id ?? ""}
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
                        selectChild(child.id);
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
                <article><span>Faith at Home</span><strong>Read, talk, pray, and take a practical faith step together.</strong></article>
                <article><span>Membership</span><strong>Manage Adventure Club access for the whole household.</strong></article>
              </section>

              <ParentApprovals
                householdId={household.id}
                childIds={children.map((child) => child.id)}
              />

              <ParentProgressOverview
                householdId={household.id}
                selectedChildId={selectedChild?.id ?? ""}
                onSelectChild={selectChild}
                onOpenChild={(childId) => {
                  selectChild(childId);
                  setKidSection("home");
                  setView("kid");
                }}
              />

              {selectedChild && (
                <>
                  <ParentChildProgress key={selectedChild.id} childId={selectedChild.id} childName={selectedChild.display_name} />
                  <div className="family-detail-grid">
                    <RewardsPanel key={selectedChild.id} childId={selectedChild.id} userId={user.id} />
                    <NotificationsPanel userId={user.id} />
                  </div>
                </>
              )}
                </>
              )}
            </>
          )}
          </Suspense>
        </main>
      </div>

      {selectedChallenge && selectedChild && selectedChallenge.childId === selectedChild.id && (
        <Suspense fallback={null}>
        <ChallengeDialog
          key={`${selectedChild.id}:${selectedChallenge.challenge.id}`}
          challenge={selectedChallenge.challenge}
          childId={selectedChild.id}
          onClose={() => setSelectedChallenge(null)}
          onCompleted={async () => {
            await loadChildDashboard();
            window.dispatchEvent(new Event("dc-progress-updated"));
          }}
        />
        </Suspense>
      )}

      {unlockOpen && (
        <Suspense fallback={null}>
        <GuardianUnlockDialog
          householdId={household.id}
          onClose={() => setUnlockOpen(false)}
          onUnlock={(token) => {
            sessionStorage.setItem("dc_guardian_session_token", token);
            localStorage.removeItem("dc_adventure_club_kid_locked");
            setKidLocked(false);
            setUnlockOpen(false);
            setView("parent");
          }}
          onSignOut={async () => {
            sessionStorage.removeItem("dc_guardian_session_token");
            await supabase.auth.signOut();
          }}
        />
        </Suspense>
      )}
    </div>
  );
}

export default function App() {
  const location = useLocation();

  useEffect(() => {
    const referralCode = new URLSearchParams(window.location.search).get("ref");
    if (referralCode) {
      localStorage.setItem(
        "dc_referral_code",
        referralCode.toUpperCase().replace(/[^A-F0-9]/g, "").slice(0, 10)
      );
    }
  }, []);
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [accountError, setAccountError] = useState("");
  const familyLoadVersion = useRef(0);
  const [household, setHousehold] = useState<Household | null>(null);
  const [children, setChildren] = useState<Child[]>([]);
  const [adminRole, setAdminRole] = useState<string | null>(null);
  const [hasOrganizationAccess, setHasOrganizationAccess] = useState(false);
  const [guardianPinConfigured, setGuardianPinConfigured] = useState<boolean | null>(null);
  const [adminUnlockOpen, setAdminUnlockOpen] = useState(false);
  const [passwordRecovery, setPasswordRecovery] = useState(
    () => window.location.hash.includes("type=recovery") || new URLSearchParams(window.location.search).get("type") === "recovery"
  );

  const authRedirectMessage = useMemo(() => {
    const search = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const description = search.get("error_description") || hash.get("error_description");
    return description ? description.replaceAll("+", " ") : "";
  }, []);

  const loadFamily = useCallback(async (user: User) => {
    const version = ++familyLoadVersion.current;
    try {
    const { data: adminData, error: adminError } = await supabase
      .from("app_admins")
      .select("role,status")
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();

    if (adminError) throw adminError;

    const { data: orgMembershipData, error: orgMembershipError } = await supabase
      .from("organization_members")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();

    if (orgMembershipError) throw orgMembershipError;

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
    if (version !== familyLoadVersion.current) return;
    if (membership && !currentHousehold) throw new Error("Household unavailable");

    if (!currentHousehold) {
      setAdminRole(adminData?.role ?? null);
      setHasOrganizationAccess(Boolean(orgMembershipData));
      setHousehold(null);
      setChildren([]);
      setGuardianPinConfigured(null);
      setAccountError("");
      return;
    }

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

    if (version !== familyLoadVersion.current) return;
    if (childResult.error) throw childResult.error;
    if (pinResult.error) throw pinResult.error;
    const pinStatus = pinResult.data?.[0];
    if (!pinStatus) throw new Error("Guardian PIN status unavailable");

    setAdminRole(adminData?.role ?? null);
    setHasOrganizationAccess(Boolean(orgMembershipData));
    setHousehold(currentHousehold);
    setChildren((childResult.data ?? []) as Child[]);
    setGuardianPinConfigured(pinStatus.configured);
    setAccountError("");

    void supabase.rpc("claim_marketing_leads_for_household", {
      p_household_id: currentHousehold.id
    });

    const storedReferralCode = localStorage.getItem("dc_referral_code");
    if (storedReferralCode) {
      void supabase
        .rpc("attribute_referral", {
          p_code: storedReferralCode,
          p_referred_household_id: currentHousehold.id,
          p_source: "adventure_club_signup"
        })
        .then(({ error }) => {
          if (!error) localStorage.removeItem("dc_referral_code");
        });
    }

    } catch (error) {
      if (version !== familyLoadVersion.current) return;
      setAccountError("We could not load your family account. Please try again. Your saved progress has not been changed.");
      throw error;
    }
  }, []);

  useEffect(() => {
    let disposed = false;
    let authVersion = 0;
    let pendingLoad: ReturnType<typeof setTimeout> | undefined;
    const acceptSession = (nextSession: Session | null) => {
      const version = ++authVersion;
      familyLoadVersion.current += 1;
      clearTimeout(pendingLoad);
      setSession(nextSession);
      setAccountError("");
      if (!nextSession) {
        setHousehold(null);
        setChildren([]);
        setAdminRole(null);
        setHasOrganizationAccess(false);
        setGuardianPinConfigured(null);
        setPasswordRecovery(false);
        setLoading(false);
        return;
      }

      setLoading(true);
      // Run database calls after the auth callback releases its session lock.
      pendingLoad = setTimeout(() => {
        if (disposed || version !== authVersion) return;
        void registerCurrentInstallation().catch(() => {});
        void loadFamily(nextSession.user)
          .catch(() => {}) // loadFamily presents the recoverable error state.
          .finally(() => {
            if (!disposed && version === authVersion) setLoading(false);
          });
      }, 0);
    };

    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (disposed) return;
      if (event === "PASSWORD_RECOVERY") setPasswordRecovery(true);
      acceptSession(nextSession);
    });

    const initialVersion = authVersion;
    void supabase.auth.getSession().then(({ data, error }) => {
      if (disposed || authVersion !== initialVersion) return;
      if (error) throw error;
      acceptSession(data.session);
    }).catch(() => {
      if (disposed || authVersion !== initialVersion) return;
      setAccountError("We could not restore your sign-in. Please reload and try again.");
      setLoading(false);
    });

    return () => {
      disposed = true;
      familyLoadVersion.current += 1;
      clearTimeout(pendingLoad);
      listener.subscription.unsubscribe();
    };
  }, [loadFamily]);

  if (loading) return <LoadingScreen />;
  if (session?.user && passwordRecovery) {
    return (
      <ResetPasswordScreen
        onComplete={() => {
          window.history.replaceState({}, document.title, "/");
          setPasswordRecovery(false);
          navigate("/", { replace: true });
        }}
      />
    );
  }

  if (accountError) {
    return (
      <main className="setup-page">
        <div className="setup-card">
          <Brand />
          <h1>Let’s reconnect</h1>
          <p role="alert" className="muted">{accountError}</p>
          <button className="primary-button" onClick={() => window.location.reload()}>Try again</button>
        </div>
      </main>
    );
  }
  if (!session?.user) return <AuthScreen initialMessage={authRedirectMessage} />;

  if (location.pathname.startsWith("/org-invite")) {
    const params = new URLSearchParams(location.search);
    const invitationId = params.get("id");
    const token = params.get("token");

    if (!invitationId || !token) {
      return (
        <main className="setup-page">
          <div className="setup-card">
            <Brand />
            <p className="eyebrow red">Leader Invitation</p>
            <h1>Invalid invitation link</h1>
            <p className="muted">This organization invitation link is incomplete.</p>
            <button className="secondary-button" onClick={() => navigate("/")}>
              Return to Adventure Club
            </button>
          </div>
        </main>
      );
    }

    return (
      <Suspense fallback={<LoadingScreen />}>
      <OrganizationInviteAccept
        invitationId={invitationId}
        token={token}
        onCancel={() => navigate("/")}
        onAccepted={async () => {
          await loadFamily(session.user);
          navigate("/");
        }}
      />
      </Suspense>
    );
  }

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
      <Suspense fallback={<LoadingScreen />}>
      <InviteAccept
        invitationId={invitationId}
        token={token}
        onAccepted={async () => {
          await loadFamily(session.user);
          navigate("/");
        }}
      />
      </Suspense>
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

    if (household && guardianPinConfigured === false) {
      return (
        <Suspense fallback={<LoadingScreen />}>
        <GuardianPinSetup
          householdId={household.id}
          onComplete={() => setGuardianPinConfigured(true)}
        />
        </Suspense>
      );
    }

    if (household && localStorage.getItem("dc_adventure_club_kid_locked") === "1") {
      return (
        <main className="setup-page">
          <div className="setup-card">
            <Brand />
            <p className="eyebrow red">Guardian Only</p>
            <h1>Unlock Family Hub first</h1>
            <p className="muted">Admin controls are available only after the guardian PIN unlocks Kid View.</p>
            <button className="primary-button" type="button" onClick={() => setAdminUnlockOpen(true)}>
              Enter guardian PIN
            </button>
            <button className="text-button" type="button" onClick={() => navigate("/")}>
              Return to Kid View
            </button>
          </div>
          {adminUnlockOpen && (
            <Suspense fallback={null}>
            <GuardianUnlockDialog
              householdId={household.id}
              onClose={() => setAdminUnlockOpen(false)}
              onUnlock={(token) => {
                sessionStorage.setItem("dc_guardian_session_token", token);
                localStorage.removeItem("dc_adventure_club_kid_locked");
                setAdminUnlockOpen(false);
              }}
              onSignOut={async () => {
                sessionStorage.removeItem("dc_guardian_session_token");
                await supabase.auth.signOut();
              }}
            />
            </Suspense>
          )}
        </main>
      );
    }

    return (
      <Suspense fallback={<LoadingScreen />}>
        <AdminPortal user={session.user} role={adminRole} onExit={() => navigate("/")} />
      </Suspense>
    );
  }

  if (!household && hasOrganizationAccess) {
    return (
      <Suspense fallback={<LoadingScreen />}>
      <LeaderOnlyPortal
        user={session.user}
        adminRole={adminRole}
        onAdmin={() => navigate("/admin")}
      />
      </Suspense>
    );
  }

  if (!household) {
    return <HouseholdSetup user={session.user} onComplete={() => loadFamily(session.user)} />;
  }

  if (!children.length) {
    return <EmptyFamily household={household} user={session.user} onAdded={() => loadFamily(session.user)} />;
  }

  if (guardianPinConfigured === false) {
    return (
      <Suspense fallback={<LoadingScreen />}>
      <GuardianPinSetup
        householdId={household.id}
        onComplete={() => setGuardianPinConfigured(true)}
      />
      </Suspense>
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
