import { FormEvent, lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "./lib/supabase";
import { registerCurrentInstallation } from "./lib/installations";
import { childProfileInput, householdInput, createOnboardingAttempt } from "./lib/onboarding";
import { readChildDashboard, type ChildSnapshot } from "./lib/childDashboard";
import { PasswordField } from "./components/PasswordField";

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
  const authBusy = useRef(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (authBusy.current) return;
    authBusy.current = true;
    setWorking(true);
    setMessage("");
    try {
    if (mode === "forgot") {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
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
            email: email.trim(),
            password,
            options: {
              emailRedirectTo: window.location.origin + window.location.pathname + window.location.search,
              data: {
                first_name: firstName.trim(),
                display_name: firstName.trim()
              }
            }
          })
        : await supabase.auth.signInWithPassword({ email: email.trim(), password });

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
    } catch {
      setMessage("We could not complete that request. Check your connection and try again.");
    } finally { authBusy.current = false; setWorking(false); }
  }

  async function resendConfirmation() {
    if (!email.trim() || authBusy.current) return;
    authBusy.current = true;
    setWorking(true);
    setMessage("");
    try {
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin + window.location.pathname + window.location.search }
    });
    setWorking(false);
    setMessage(error ? error.message : "A new confirmation email has been requested. Please check your inbox and spam folder.");
    } catch {
      setMessage("We could not request another confirmation email. Please try again.");
    } finally { authBusy.current = false; setWorking(false); }
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
                  disabled={working}
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
                disabled={working}
                onChange={(event) => { setEmail(event.target.value); setConfirmationPending(false); }}
              />
            </label>
            {mode !== "forgot" && (
                <PasswordField
                  key={mode}
                  label="Password"
                  required
                  minLength={8}
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  value={password}
                  disabled={working}
                  onChange={(event) => setPassword(event.target.value)}
                />
            )}

            {message && <div className="form-message" role="status">{message}</div>}

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
              disabled={working}
              onClick={() => {
                setMode(mode === "signin" ? "signup" : "signin");
                setMessage("");
                setConfirmationPending(false);
              }}
            >
              {mode === "signin" ? "New family? Create an account" : "Back to sign in"}
            </button>
            {mode === "signin" && (
              <button type="button" disabled={working} className="text-button" onClick={() => { setMode("forgot"); setMessage(""); setConfirmationPending(false); }}>
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
  const busy = useRef(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy.current) return;
    setMessage("");
    if (password.length < 8) {
      setMessage("Choose a password with at least 8 characters.");
      return;
    }
    if (password !== confirmation) {
      setMessage("The passwords do not match.");
      return;
    }

    busy.current = true;
    setWorking(true);
    try {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setMessage(error.message);
      return;
    }
    setPassword("");
    setConfirmation("");
    onComplete();
    } catch {
      setMessage("We could not confirm the password update. Try again, or sign in with your new password if it was saved.");
    } finally { busy.current = false; setWorking(false); }
  }

  return (
    <main className="setup-page">
      <div className="setup-card">
        <Brand />
        <p className="eyebrow red">Guardian Account</p>
        <h1>Choose a new password</h1>
        <p className="muted">This updates the password for the adult Adventure Club account.</p>
        <form className="form-stack" onSubmit={submit}>
          <PasswordField label="New password" required disabled={working} minLength={8} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} />
          <PasswordField label="Confirm new password" required disabled={working} minLength={8} autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} />
          {message && <div className="form-message" role="alert">{message}</div>}
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
  const attempt = useRef(createOnboardingAttempt());
  const busy = useRef(false);
  const needsRefresh = attempt.current.state() === "saved" || attempt.current.state() === "uncertain";

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy.current) return;
    busy.current = true;
    setWorking(true);
    setError("");
    try {
      if (!needsRefresh) {
        const input = householdInput(name, acceptedTerms, Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Chicago");
        await attempt.current.run(() => supabase.rpc("create_household_with_consent", input));
      }
      await onComplete();
    } catch (cause) {
      setError(attempt.current.state() === "uncertain"
        ? "We could not confirm whether your family hub was saved. Refresh your family hub to check before creating another."
        : attempt.current.state() === "saved"
          ? "Your family hub was created. Refresh to continue setup."
          : cause instanceof Error ? cause.message : "We could not create your family hub. Please try again.");
    } finally { busy.current = false; setWorking(false); }
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
            <input required disabled={working || needsRefresh} value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          <label className="onboarding-consent">
            <input
              type="checkbox"
              checked={acceptedTerms}
              disabled={working || needsRefresh}
              onChange={(event) => setAcceptedTerms(event.target.checked)}
            />
            <span>
              I am the parent/guardian account holder and agree to the current Guardian Account Terms for this family hub.
            </span>
          </label>
          {error && <div className="form-message" role="alert">{error}</div>}
          <button className="primary-button" disabled={working}>
            {working ? "Please wait..." : needsRefresh ? "Refresh family hub" : "Create family hub"}
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
  const attempt = useRef(createOnboardingAttempt());
  const busy = useRef(false);
  const needsRefresh = attempt.current.state() === "saved" || attempt.current.state() === "uncertain";

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy.current) return;
    busy.current = true;
    setWorking(true);
    setError("");
    try {
      if (!needsRefresh) {
        const input = childProfileInput(name, birthYear, guardianConsent);
        await attempt.current.run(() => supabase.rpc("create_child_with_consent", { p_household_id: household.id, ...input }));
      }
      await onAdded();
    } catch (cause) {
      setError(attempt.current.state() === "uncertain"
        ? "We could not confirm whether the profile was saved. Refresh your family profiles to check before adding this child again."
        : attempt.current.state() === "saved"
          ? "The child profile was saved. Refresh your family profiles to continue."
          : cause instanceof Error ? cause.message : "We could not add this profile. Please try again.");
    } finally { busy.current = false; setWorking(false); }
  }

  return (
    <form className={compact ? "child-form compact" : "child-form"} onSubmit={submit}>
      <div>
        <label>
          Child's first name or nickname
          <input required disabled={working || needsRefresh} value={name} onChange={(event) => setName(event.target.value)} />
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
            disabled={working || needsRefresh}
            onChange={(event) => setBirthYear(event.target.value)}
          />
        </label>
      </div>
      <label className="child-consent">
        <input
          type="checkbox"
          checked={guardianConsent}
          disabled={working || needsRefresh}
          onChange={(event) => setGuardianConsent(event.target.checked)}
        />
        <span>
          I am the parent/guardian and approve this protected child profile for Adventure Club participation.
        </span>
      </label>
      {error && <div className="form-message" role="alert">{error}</div>}
      <button className="secondary-button" disabled={working}>
        {working ? "Please wait..." : needsRefresh ? "Refresh family profiles" : "Add child profile"}
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
        <AddChildForm key={household.id+":"+user.id} household={household} user={user} onAdded={onAdded} />
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
                key={household.id+":"+user.id}
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
                  <ReferralSupportCard key={household.id+":"+user.id} householdId={household.id} user={user} />
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
                  key={household.id}
                  householdId={household.id}
                  user={user}
                  children={children.map((child) => ({ id: child.id, display_name: child.display_name }))}
                  selectedChildId={selectedChild?.id ?? ""}
                />
              ) : parentSection === "groups" ? (
                <FamilyGroupsCard
                  key={household.id}
                  onSelectChild={selectChild}
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
         …22238 tokens truncated…rship-footnote {
  margin: 16px 0 0;
  color: #77736e;
  font-size: .72rem;
  line-height: 1.5;
}
@media (max-width: 850px) {
  .family-faith-selector,
  .membership-feature-grid { grid-template-columns: 1fr; }
}


/* Family order history */
.order-history-card {
  margin-top: 22px;
  padding: 24px;
  border: 1px solid var(--line);
  border-radius: 22px;
  background: #101010;
}
.order-history-list {
  display: grid;
  gap: 11px;
}
.order-history-row {
  padding: 16px;
  border: 1px solid var(--line);
  border-radius: 15px;
  background: #090909;
}
.order-history-main {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  align-items: flex-start;
}
.order-history-main strong,
.order-history-main span {
  display: block;
}
.order-history-main span:not(.status-chip) {
  margin-top: 4px;
  color: #817d77;
  font-size: .72rem;
}
.order-item-list {
  display: grid;
  gap: 6px;
  margin-top: 13px;
  padding-top: 12px;
  border-top: 1px solid var(--line);
}
.order-item-list div {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  color: #aaa59e;
  font-size: .77rem;
}
.order-item-list strong {
  color: #d7d2cb;
}
.order-fulfillment-note {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 12px;
  color: #817d77;
  font-size: .72rem;
}
.order-fulfillment-note a {
  color: var(--gold);
}
.commerce-order-row {
  display: grid;
  grid-template-columns: minmax(0,1fr) auto minmax(180px,240px);
  gap: 12px;
  align-items: center;
  padding: 14px;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: #0b0b0b;
}
.commerce-order-row strong,
.commerce-order-row small {
  display: block;
}
.commerce-order-row small {
  margin-top: 5px;
  color: #8f8b85;
  font-size: .72rem;
}
@media (max-width: 720px) {
  .commerce-order-row { grid-template-columns: 1fr auto; }
  .commerce-order-row select { grid-column: 1 / -1; }
}


/* Adventure Club Groups */
.family-groups-card {
  margin-top: 22px;
  padding: 24px;
  border: 1px solid var(--line);
  border-radius: 22px;
  background: #101010;
}
.group-join-form {
  display: grid;
  grid-template-columns: 1fr 1fr auto;
  gap: 10px;
  align-items: end;
  margin-bottom: 14px;
}
.group-preview {
  display: flex;
  justify-content: space-between;
  gap: 18px;
  align-items: center;
  padding: 16px;
  margin-bottom: 14px;
  border: 1px solid rgba(240,198,91,.18);
  border-radius: 15px;
  background: rgba(240,198,91,.05);
}
.group-preview span,
.family-group-head span,
.group-assignment-row span {
  color: #8f8b85;
  font-size: .66rem;
  font-weight: 850;
  text-transform: uppercase;
  letter-spacing: .07em;
}
.group-preview h3,
.family-group-head h3 {
  margin: 4px 0;
}
.group-preview p,
.family-group-head p {
  margin: 0;
  color: #8f8b85;
  font-size: .78rem;
}
.group-preview-actions {
  display: grid;
  gap: 8px;
  justify-items: end;
}
.group-preview-actions small {
  color: #77736e;
}
.family-group-list {
  display: grid;
  gap: 10px;
}
.family-group-row {
  padding: 16px;
  border: 1px solid var(--line);
  border-radius: 15px;
  background: #090909;
}
.family-group-head {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
}
.group-assignment-list {
  display: grid;
  gap: 7px;
  margin-top: 13px;
  padding-top: 12px;
  border-top: 1px solid var(--line);
}
.group-assignment-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  width: 100%;
  padding: 11px;
  text-align: left;
  color: #d7d2cb;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: #101010;
}
.group-assignment-row strong,
.group-assignment-row span {
  display: block;
}
.group-assignment-row strong {
  margin-top: 3px;
}
.group-assignment-row small {
  color: #817d77;
}
@media (max-width: 760px) {
  .group-join-form { grid-template-columns: 1fr; }
  .group-preview,
  .family-group-head,
  .group-assignment-row { align-items: flex-start; flex-direction: column; }
  .group-preview-actions { justify-items: start; }
}


/* Organization + leader group tools */
.leader-groups-hub {
  margin-top: 22px;
  padding: 24px;
  border: 1px solid var(--line);
  border-radius: 22px;
  background: #101010;
}
.leader-group-selectors {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.leader-create-group {
  margin-top: 14px;
  padding: 14px;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: #090909;
}
.leader-create-group summary {
  cursor: pointer;
  font-weight: 850;
}
.leader-create-group .admin-form {
  margin-top: 14px;
}
.leader-code-card {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
  margin-top: 14px;
  padding: 16px;
  border: 1px solid rgba(240,198,91,.18);
  border-radius: 15px;
  background: rgba(240,198,91,.05);
}
.leader-code-card span,
.leader-code-card strong,
.leader-code-card small {
  display: block;
}
.leader-code-card span {
  color: #8f8b85;
  font-size: .66rem;
  font-weight: 850;
  text-transform: uppercase;
}
.leader-code-card strong {
  margin: 4px 0;
  color: var(--gold);
  font-size: 1.5rem;
  letter-spacing: .08em;
}
.leader-code-card small {
  max-width: 620px;
  color: #77736e;
}
.leader-groups-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-top: 14px;
}
.leader-panel {
  padding: 16px;
  border: 1px solid var(--line);
  border-radius: 15px;
  background: #090909;
}
.leader-panel label {
  margin-bottom: 10px;
}
.leader-panel button {
  width: 100%;
}
.leader-roster {
  display: grid;
  gap: 8px;
}
.leader-roster > div {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 9px;
  border: 1px solid var(--line);
  border-radius: 11px;
  background: #101010;
}
.leader-assignment-progress {
  display: grid;
  gap: 9px;
  margin-top: 14px;
}
.leader-assignment-progress > article {
  display: grid;
  grid-template-columns: 1fr minmax(180px,280px);
  gap: 14px;
  align-items: center;
  padding: 14px;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: #090909;
}
.leader-assignment-progress span,
.leader-assignment-progress strong,
.leader-assignment-progress small {
  display: block;
}
.leader-assignment-progress span {
  color: #8f8b85;
  font-size: .65rem;
  font-weight: 850;
  text-transform: uppercase;
}
.leader-assignment-progress small {
  margin-top: 4px;
  color: #77736e;
}
.leader-progress-meter > strong {
  display: block;
  text-align: right;
}
.leader-progress-meter .level-progress-track {
  margin: 6px 0 0;
}
@media (max-width: 820px) {
  .leader-group-selectors,
  .leader-groups-grid { grid-template-columns: 1fr; }
  .leader-code-card { align-items: flex-start; flex-direction: column; }
  .leader-assignment-progress > article { grid-template-columns: 1fr; }
  .leader-progress-meter > strong { text-align: left; }
}


/* Events, referrals and support */
.family-events-card,
.referral-support-card {
  margin-top: 22px;
  padding: 24px;
  border: 1px solid var(--line);
  border-radius: 22px;
  background: #101010;
}
.event-child-selector {
  max-width: 320px;
  margin-bottom: 14px;
}
.family-events-list {
  display: grid;
  gap: 10px;
}
.family-event-row {
  display: grid;
  grid-template-columns: auto minmax(0,1fr) auto;
  gap: 14px;
  align-items: center;
  padding: 15px;
  border: 1px solid var(--line);
  border-radius: 15px;
  background: #090909;
}
.event-date-box {
  display: grid;
  place-items: center;
  width: 58px;
  height: 62px;
  border-radius: 14px;
  background: linear-gradient(145deg,#c52a2a,#7b1212);
  color: white;
}
.event-date-box strong {
  font-size: .68rem;
  text-transform: uppercase;
}
.event-date-box span {
  font-size: 1.55rem;
  font-weight: 900;
}
.family-event-copy > span {
  color: #8f8b85;
  font-size: .65rem;
  font-weight: 850;
  text-transform: uppercase;
}
.family-event-copy h3 {
  margin: 3px 0 5px;
}
.family-event-copy p {
  margin: 0 0 5px;
  color: #8f8b85;
  line-height: 1.45;
  font-size: .78rem;
}
.family-event-copy small {
  color: #77736e;
}
.family-event-action {
  display: grid;
  gap: 7px;
  justify-items: end;
}
.referral-code-box {
  margin-top: 16px;
  padding: 16px;
  border: 1px solid rgba(240,198,91,.18);
  border-radius: 14px;
  background: rgba(240,198,91,.05);
}
.referral-code-box strong,
.referral-code-box span {
  display: block;
}
.referral-code-box strong {
  color: var(--gold);
  font-size: 1.7rem;
  letter-spacing: .08em;
}
.referral-code-box span {
  margin-top: 5px;
  color: #817d77;
  font-size: .72rem;
}
.support-ticket-list {
  display: grid;
  gap: 8px;
  margin-top: 14px;
}
.support-ticket-list article {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  padding: 12px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: #090909;
}
.support-ticket-list strong,
.support-ticket-list span {
  display: block;
}
.support-ticket-list > article > div > span {
  margin-top: 4px;
  color: #77736e;
  font-size: .68rem;
  text-transform: capitalize;
}
.support-admin-list {
  display: grid;
  gap: 10px;
}
.support-admin-list > article {
  display: grid;
  grid-template-columns: 1fr minmax(180px,240px);
  gap: 14px;
  padding: 15px;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: #090909;
}
.support-admin-copy > span {
  color: #8f8b85;
  font-size: .66rem;
  font-weight: 850;
  text-transform: uppercase;
}
.support-admin-copy h3 {
  margin: 5px 0;
}
.support-admin-copy p {
  margin: 0 0 6px;
  color: #aaa59e;
  line-height: 1.5;
}
.support-admin-copy small {
  color: #77736e;
}
.support-admin-actions {
  display: grid;
  gap: 8px;
  align-content: start;
}
@media (max-width: 760px) {
  .family-event-row { grid-template-columns: auto 1fr; }
  .family-event-action { grid-column: 1 / -1; justify-items: start; }
  .support-admin-list > article { grid-template-columns: 1fr; }
}


/* DC Governance Center */
.governance-admin {
  display: grid;
  gap: 18px;
}
.governance-hero {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  align-items: center;
  padding: 28px;
  border: 1px solid rgba(240,198,91,.18);
  border-radius: 24px;
  background:
    radial-gradient(circle at 90% 0%, rgba(240,198,91,.10), transparent 22rem),
    linear-gradient(135deg,#17120a,#111 60%,#1b0c0c);
}
.governance-hero h2 {
  margin-bottom: 8px;
  font-size: clamp(2rem,4vw,3.4rem);
}
.governance-hero p:last-child {
  max-width: 850px;
  margin: 0;
  color: #a9a49d;
  line-height: 1.55;
}
.governance-lock {
  flex: 0 0 auto;
  padding: 14px 18px;
  border: 1px solid rgba(240,198,91,.28);
  border-radius: 14px;
  color: var(--gold);
  font-size: .72rem;
  font-weight: 950;
  letter-spacing: .16em;
}
.governance-standard-grid {
  display: grid;
  grid-template-columns: repeat(5,minmax(0,1fr));
  gap: 10px;
}
.governance-standard-grid article {
  padding: 16px;
  border: 1px solid var(--line);
  border-radius: 16px;
  background: #0c0c0c;
}
.governance-standard-grid span,
.governance-standard-grid small {
  display: block;
  color: #817d77;
  font-size: .64rem;
  text-transform: uppercase;
}
.governance-standard-grid h3 {
  margin: 5px 0;
  font-size: 1rem;
}
.governance-standard-grid p {
  margin: 8px 0 0;
  color: #8f8b85;
  font-size: .72rem;
  line-height: 1.45;
}
.governance-selected {
  display: grid;
  grid-template-columns: repeat(3,1fr);
  gap: 8px;
  margin: 14px 0;
}
.governance-selected div {
  padding: 12px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: #090909;
}
.governance-selected span,
.governance-selected strong {
  display: block;
}
.governance-selected span {
  color: #77736e;
  font-size: .63rem;
  text-transform: uppercase;
}
.governance-selected strong {
  margin-top: 4px;
  text-transform: capitalize;
}
.governance-checklist {
  display: grid;
  gap: 8px;
  margin: 16px 0 10px;
}
.governance-check {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 11px;
  border: 1px solid var(--line);
  border-radius: 11px;
  background: #090909;
}
.governance-check input {
  width: auto;
  accent-color: var(--red-bright);
}
.governance-publish {
  width: 100%;
  margin-top: 12px;
}
.governance-assets,
.governance-characters {
  display: grid;
  gap: 10px;
}
.governance-assets article,
.governance-characters article {
  padding: 14px;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: #090909;
}
.governance-assets article {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 12px;
}
.governance-assets span,
.governance-assets strong,
.governance-assets small,
.governance-characters span,
.governance-characters small {
  display: block;
}
.governance-assets span,
.governance-characters span {
  color: #8f8b85;
  font-size: .63rem;
  text-transform: uppercase;
}
.governance-assets img {
  width: 70px;
  height: 70px;
  border-radius: 13px;
  object-fit: cover;
}
.governance-assets p,
.governance-characters p {
  grid-column: 1 / -1;
  margin: 4px 0 0;
  color: #8f8b85;
  font-size: .72rem;
  line-height: 1.45;
}
.governance-rule-list {
  display: grid;
  gap: 9px;
}
.governance-rule-list article {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 14px;
  padding: 14px;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: #090909;
}
.governance-rule-list span {
  color: #ff6a6a;
  font-size: .62rem;
  font-weight: 850;
  text-transform: uppercase;
}
.governance-rule-list h3 {
  margin: 4px 0 6px;
}
.governance-rule-list p {
  margin: 0;
  color: #9b9690;
  line-height: 1.5;
  font-size: .78rem;
}
.governance-rule-list small {
  color: #77736e;
}
.governance-editor-note {
  grid-column: 1 / -1;
  padding: 11px 13px;
  border: 1px solid rgba(240,198,91,.18);
  border-radius: 12px;
  background: rgba(240,198,91,.05);
  color: #c9bb8e;
  font-size: .75rem;
  line-height: 1.45;
}
@media (max-width: 1200px) {
  .governance-standard-grid { grid-template-columns: repeat(2,1fr); }
}
@media (max-width: 700px) {
  .governance-hero { align-items:flex-start; flex-direction:column; }
  .governance-standard-grid,
  .governance-selected { grid-template-columns: 1fr; }
  .governance-rule-list article { grid-template-columns: 1fr; }
}


/* DC governance preflight */
.governance-preflight {
  margin: 14px 0;
  padding: 14px;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: #090909;
}
.governance-preflight-list {
  display: grid;
  gap: 8px;
}
.governance-preflight-list article {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 10px;
  align-items: start;
  padding: 10px 12px;
  border-radius: 11px;
  border: 1px solid var(--line);
}
.governance-preflight-list article.error {
  border-color: rgba(239,52,52,.26);
  background: rgba(198,40,40,.08);
}
.governance-preflight-list article.warning {
  border-color: rgba(240,198,91,.20);
  background: rgba(240,198,91,.05);
}
.governance-preflight-list strong {
  font-size: .64rem;
  text-transform: uppercase;
  letter-spacing: .07em;
}
.governance-preflight-list .error strong {
  color: #ff7777;
}
.governance-preflight-list .warning strong {
  color: var(--gold);
}
.governance-preflight-list span {
  color: #a39e97;
  font-size: .76rem;
  line-height: 1.45;
}


/* DC creative blueprints */
.governance-blueprints {
  display: grid;
  grid-template-columns: repeat(2,minmax(0,1fr));
  gap: 12px;
}
.governance-blueprints > article {
  padding: 17px;
  border: 1px solid var(--line);
  border-radius: 16px;
  background: #090909;
}
.governance-blueprint-head span,
.governance-blueprint-head small {
  display: block;
  color: #817d77;
  font-size: .63rem;
  text-transform: uppercase;
}
.governance-blueprint-head h3 {
  margin: 4px 0;
}
.governance-blueprints > article > p {
  color: #9b9690;
  line-height: 1.5;
  font-size: .77rem;
}
.governance-blueprint-requirements {
  display: grid;
  gap: 7px;
  margin-top: 12px;
}
.governance-blueprint-requirements > div {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 4px 12px;
  padding: 10px;
  border: 1px solid var(--line);
  border-radius: 11px;
  background: #111;
}
.governance-blueprint-requirements strong,
.governance-blueprint-requirements span {
  display: block;
}
.governance-blueprint-requirements strong {
  font-size: .8rem;
}
.governance-blueprint-requirements span {
  grid-column: 1 / -1;
  color: #88847e;
  font-size: .7rem;
  line-height: 1.4;
}
.governance-blueprint-requirements small {
  color: var(--gold);
  font-size: .6rem;
  text-transform: uppercase;
}
@media (max-width: 800px) {
  .governance-blueprints { grid-template-columns: 1fr; }
}


/* Guardian onboarding consent */
.onboarding-consent,
.child-consent {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 13px;
  border: 1px solid rgba(240,198,91,.18);
  border-radius: 13px;
  background: rgba(240,198,91,.045);
  color: #b9b4ad;
  font-size: .76rem;
  line-height: 1.45;
}
.onboarding-consent input,
.child-consent input {
  width: auto;
  margin-top: 2px;
  accent-color: var(--red-bright);
}
.child-form .child-consent {
  grid-column: 1 / -1;
}

/* Guardian privacy & data controls */
.privacy-controls-card {
  margin-top: 22px;
  padding: 24px;
  border: 1px solid var(--line);
  border-radius: 22px;
  background: #101010;
}
.privacy-two-column {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-top: 16px;
}
.privacy-panel,
.privacy-data-inventory,
.privacy-request-panel {
  padding: 17px;
  border: 1px solid var(--line);
  border-radius: 16px;
  background: #090909;
}
.privacy-consent-list {
  display: grid;
  gap: 8px;
}
.privacy-consent-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 12px;
  align-items: center;
  padding: 12px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: #111;
}
.privacy-consent-row strong,
.privacy-consent-row small {
  display: block;
}
.privacy-consent-row p {
  margin: 4px 0;
  color: #8f8b85;
  font-size: .72rem;
  line-height: 1.45;
}
.privacy-consent-row small {
  color: #6f6b66;
  font-size: .65rem;
}
.privacy-data-inventory,
.privacy-request-panel {
  margin-top: 12px;
}
.privacy-inventory-grid {
  display: grid;
  grid-template-columns: repeat(4,minmax(0,1fr));
  gap: 8px;
}
.privacy-inventory-grid div {
  padding: 12px;
  border: 1px solid var(--line);
  border-radius: 11px;
  background: #111;
}
.privacy-inventory-grid strong,
.privacy-inventory-grid span {
  display: block;
}
.privacy-inventory-grid strong {
  font-size: 1.45rem;
}
.privacy-inventory-grid span {
  margin-top: 3px;
  color: #77736e;
  font-size: .64rem;
  text-transform: uppercase;
}
.privacy-profile-actions {
  margin-top: 12px;
}
.privacy-request-form {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  align-items: end;
}
.privacy-reason {
  grid-column: 1 / -1;
}
.privacy-request-history {
  display: grid;
  gap: 8px;
  margin-top: 16px;
}
.privacy-request-history > div {
  display: grid;
  grid-template-columns: minmax(0,1fr) auto auto;
  gap: 10px;
  align-items: center;
  padding: 11px;
  border: 1px solid var(--line);
  border-radius: 11px;
  background: #111;
}
.privacy-request-history strong,
.privacy-request-history span {
  display: block;
}
.privacy-request-history > div > div > span {
  margin-top: 4px;
  color: #77736e;
  font-size: .66rem;
}

/* Admin analytics & privacy operations */
.analytics-privacy-admin {
  display: grid;
  gap: 18px;
}
.analytics-snapshot {
  padding: 24px;
  border: 1px solid rgba(240,198,91,.16);
  border-radius: 22px;
  background:
    radial-gradient(circle at 95% 0%,rgba(240,198,91,.08),transparent 20rem),
    #101010;
}
.analytics-snapshot-grid,
.analytics-period-grid {
  display: grid;
  grid-template-columns: repeat(4,minmax(0,1fr));
  gap: 9px;
}
.analytics-snapshot-grid article,
.analytics-period-grid article {
  padding: 14px;
  border: 1px solid var(--line);
  border-radius: 13px;
  background: #090909;
}
.analytics-snapshot-grid strong,
.analytics-snapshot-grid span,
.analytics-period-grid strong,
.analytics-period-grid span {
  display: block;
}
.analytics-snapshot-grid strong,
.analytics-period-grid strong {
  font-size: 1.7rem;
}
.analytics-snapshot-grid span,
.analytics-period-grid span {
  margin-top: 4px;
  color: #77736e;
  font-size: .63rem;
  text-transform: uppercase;
}
.analytics-daily-table {
  margin-top: 16px;
  overflow-x: auto;
}
.analytics-daily-head,
.analytics-daily-table > div:not(.analytics-daily-head) {
  min-width: 650px;
  display: grid;
  grid-template-columns: 1.4fr repeat(5,.8fr);
  gap: 8px;
  padding: 9px 10px;
}
.analytics-daily-head {
  color: #77736e;
  font-size: .62rem;
  font-weight: 850;
  text-transform: uppercase;
}
.analytics-daily-table > div:not(.analytics-daily-head) {
  border-top: 1px solid var(--line);
  color: #aaa59e;
  font-size: .73rem;
}
.privacy-admin-row,
.notification-delivery-row {
  display: grid;
  grid-template-columns: minmax(0,1fr) auto;
  gap: 10px;
  align-items: center;
  padding: 12px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: #090909;
}
.privacy-admin-row small,
.notification-delivery-row small {
  display: block;
  margin-top: 4px;
  color: #77736e;
  font-size: .66rem;
}
.privacy-admin-row p {
  margin: 6px 0 0;
  color: #8f8b85;
  font-size: .72rem;
}
@media (max-width: 900px) {
  .privacy-two-column,
  .analytics-snapshot-grid,
  .analytics-period-grid { grid-template-columns: repeat(2,minmax(0,1fr)); }
  .privacy-inventory-grid { grid-template-columns: repeat(2,minmax(0,1fr)); }
}
@media (max-width: 620px) {
  .privacy-two-column,
  .analytics-snapshot-grid,
  .analytics-period-grid,
  .privacy-request-form { grid-template-columns: 1fr; }
  .privacy-request-history > div { grid-template-columns: 1fr auto; }
  .privacy-request-history .text-button { grid-column: 1 / -1; justify-self: start; }
}


/* Privacy export actions */
.privacy-request-history .secondary-button.compact {
  padding: 8px 10px;
  font-size: .7rem;
  white-space: nowrap;
}
@media (max-width: 760px) {
  .privacy-request-history > div {
    grid-template-columns: 1fr auto;
  }
  .privacy-request-history .secondary-button,
  .privacy-request-history .text-button {
    grid-column: 1 / -1;
    justify-self: start;
  }
}


/* Guardian communications center */
.communications-admin {
  display: grid;
  gap: 18px;
}
.communications-hero {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  align-items: center;
  padding: 24px;
  border: 1px solid rgba(240,198,91,.16);
  border-radius: 22px;
  background:
    radial-gradient(circle at 92% 0%,rgba(240,198,91,.08),transparent 20rem),
    #101010;
}
.communications-hero h2 {
  margin-bottom: 7px;
  font-size: clamp(2rem,4vw,3.1rem);
}
.communications-hero p:last-child {
  max-width: 780px;
  margin: 0;
  color: #99948d;
  line-height: 1.5;
}
.communications-audience {
  flex: 0 0 auto;
  min-width: 150px;
  padding: 16px;
  text-align: center;
  border: 1px solid var(--line);
  border-radius: 16px;
  background: #090909;
}
.communications-audience strong,
.communications-audience span {
  display: block;
}
.communications-audience strong {
  color: var(--gold);
  font-size: 2.2rem;
}
.communications-audience span {
  margin-top: 4px;
  color: #77736e;
  font-size: .67rem;
}
.communication-channel-picks {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px 16px;
  padding: 12px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: #090909;
}
.communication-channel-picks > span {
  width: 100%;
  color: #aaa59e;
  font-size: .72rem;
  font-weight: 850;
}
.communication-channel-picks label {
  display: flex;
  align-items: center;
  gap: 7px;
}
.communication-channel-picks input {
  width: auto;
  accent-color: var(--red-bright);
}
.communication-channel-picks small {
  width: 100%;
  color: #77736e;
}
.communications-template-row,
.communications-campaign-row {
  display: grid;
  grid-template-columns: minmax(0,1fr) auto;
  gap: 12px;
  align-items: start;
  padding: 13px;
  border: 1px solid var(--line);
  border-radius: 13px;
  background: #090909;
}
.communications-template-row strong,
.communications-template-row small,
.communications-template-row p,
.communications-campaign-row strong,
.communications-campaign-row small,
.communications-campaign-row p,
.communications-campaign-row em {
  display: block;
}
.communications-template-row small,
.communications-campaign-row small {
  margin-top: 4px;
  color: #77736e;
  font-size: .67rem;
}
.communications-template-row p,
.communications-campaign-row p {
  margin: 7px 0 0;
  color: #aaa59e;
  font-size: .76rem;
}
.communications-campaign-row em {
  margin-top: 6px;
  color: #ff8a8a;
  font-size: .68rem;
  font-style: normal;
}
.communications-campaign-status {
  display: grid;
  gap: 7px;
  justify-items: end;
}
.communications-preview {
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding: 12px;
  border: 1px solid rgba(240,198,91,.18);
  border-radius: 12px;
  background: rgba(240,198,91,.05);
}
.communications-preview strong {
  color: var(--gold);
  font-size: 1.6rem;
}
.communications-preview span {
  color: #8f8b85;
  font-size: .75rem;
}
.quiet-hours-settings {
  display: grid;
  grid-template-columns: 1.4fr repeat(3,1fr);
  gap: 10px;
  align-items: end;
  margin: 18px 0;
  padding: 14px;
  border: 1px solid rgba(240,198,91,.14);
  border-radius: 14px;
  background: rgba(240,198,91,.035);
}
.quiet-hours-settings p {
  margin-bottom: 4px;
}
@media (max-width: 900px) {
  .communications-hero { align-items:flex-start; flex-direction:column; }
  .quiet-hours-settings { grid-template-columns: 1fr 1fr; }
  .quiet-hours-settings > div { grid-column: 1 / -1; }
}
@media (max-width: 620px) {
  .communications-template-row,
  .communications-campaign-row { grid-template-columns: 1fr; }
  .communications-campaign-status { justify-items:start; }
  .quiet-hours-settings { grid-template-columns: 1fr; }
}


/* Automatic reminder rules */
.communications-reminder-section {
  margin-top: 0;
}


/* Adult organization invitations and leader-only access */
.organization-invite-preview {
  margin: 20px 0;
  padding: 17px;
  border: 1px solid rgba(240,198,91,.18);
  border-radius: 16px;
  background: rgba(240,198,91,.05);
}
.organization-invite-preview > span {
  color: var(--gold);
  font-size: .67rem;
  font-weight: 850;
  text-transform: uppercase;
  letter-spacing: .08em;
}
.organization-invite-preview h2 {
  margin: 5px 0 10px;
}
.organization-invite-preview p {
  margin: 5px 0;
  color: #aaa59e;
}
.organization-invite-preview small {
  display: block;
  margin-top: 10px;
  color: #77736e;
}
.leader-only-main {
  max-width: 1450px;
  width: 100%;
  margin: 0 auto;
  padding: clamp(24px,4vw,50px);
}
.leader-only-hero {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  align-items: center;
  padding: 28px;
  margin-bottom: 20px;
  border: 1px solid rgba(240,198,91,.16);
  border-radius: 24px;
  background:
    radial-gradient(circle at 90% 0%,rgba(240,198,91,.08),transparent 20rem),
    #101010;
}
.leader-only-hero h1 {
  margin-bottom: 8px;
  font-size: clamp(2.3rem,5vw,4.2rem);
}
.leader-only-hero p:last-child {
  max-width: 720px;
  margin: 0;
  color: #99948d;
}
.leader-account-chip {
  min-width: 220px;
  padding: 14px;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: #090909;
}
.leader-account-chip span,
.leader-account-chip strong {
  display: block;
}
.leader-account-chip span {
  color: #77736e;
  font-size: .65rem;
  text-transform: uppercase;
}
.leader-account-chip strong {
  margin-top: 4px;
  overflow-wrap: anywhere;
}
.leader-adult-invites {
  margin-top: 14px;
  padding: 16px;
  border: 1px solid var(--line);
  border-radius: 15px;
  background: #090909;
}
.leader-invite-link {
  display: grid;
  gap: 8px;
  margin-top: 14px;
  padding: 13px;
  border: 1px solid rgba(240,198,91,.18);
  border-radius: 12px;
  background: rgba(240,198,91,.05);
}
.leader-invite-link code {
  overflow-wrap: anywhere;
  color: #c8c2ba;
  font-size: .72rem;
}
.leader-invitation-list {
  display: grid;
  gap: 8px;
  margin-top: 14px;
}
.leader-invitation-list article {
  display: grid;
  grid-template-columns: minmax(0,1fr) auto;
  gap: 12px;
  align-items: center;
  padding: 11px;
  border: 1px solid var(--line);
  border-radius: 11px;
  background: #111;
}
.leader-invitation-list strong,
.leader-invitation-list span,
.leader-invitation-list small {
  display: block;
}
.leader-invitation-list > article > div:first-child > span,
.leader-invitation-list small {
  margin-top: 3px;
  color: #77736e;
  font-size: .67rem;
  text-transform: capitalize;
}
.leader-invitation-list > article > div:last-child {
  display: grid;
  gap: 6px;
  justify-items: end;
}
@media (max-width: 760px) {
  .leader-only-hero { align-items:flex-start; flex-direction:column; }
  .leader-account-chip { width:100%; }
  .leader-invitation-list article { grid-template-columns:1fr; }
  .leader-invitation-list > article > div:last-child { justify-items:start; }
}


/* PIN-backed guardian challenge approvals */
.parent-approvals-card {
  margin-top: 22px;
  padding: 24px;
  border: 1px solid rgba(239,52,52,.18);
  border-radius: 22px;
  background:
    radial-gradient(circle at 100% 0%,rgba(198,40,40,.08),transparent 18rem),
    #101010;
}
.parent-approvals-card.clear {
  display: flex;
  justify-content: space-between;
  gap: 18px;
  align-items: center;
  border-color: rgba(111,184,121,.18);
  background: rgba(68,126,76,.045);
}
.parent-approvals-card.clear h2 {
  margin-bottom: 6px;
}
.parent-approvals-card.clear p:last-child {
  margin: 0;
  color: #8f8b85;
}
.guardian-approval-unlock {
  display: grid;
  grid-template-columns: minmax(180px,280px) auto;
  gap: 10px;
  align-items: end;
  margin: 16px 0;
}
.guardian-session-chip {
  display: flex;
  gap: 9px;
  align-items: center;
  margin: 14px 0;
  padding: 11px 13px;
  border: 1px solid rgba(111,184,121,.22);
  border-radius: 12px;
  background: rgba(68,126,76,.08);
}
.guardian-session-chip > span {
  color: #a7d4af;
}
.guardian-session-chip strong {
  color: #d8e9db;
}
.guardian-session-chip small {
  margin-left: auto;
  color: #7f9b84;
}
.parent-approval-list {
  display: grid;
  gap: 10px;
}
.parent-approval-list article {
  display: grid;
  grid-template-columns: auto minmax(0,1fr) auto;
  gap: 13px;
  align-items: center;
  padding: 15px;
  border: 1px solid var(--line);
  border-radius: 15px;
  background: #090909;
}
.parent-approval-icon {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border-radius: 12px;
  background: rgba(240,198,91,.10);
  color: var(--gold);
}
.parent-approval-copy > span {
  color: #8f8b85;
  font-size: .64rem;
  font-weight: 850;
  text-transform: uppercase;
}
.parent-approval-copy h3 {
  margin: 4px 0 5px;
}
.parent-approval-copy p {
  margin: 0;
  color: #aaa59e;
  font-size: .78rem;
}
.parent-approval-copy small {
  display: block;
  margin-top: 5px;
  color: #77736e;
  font-size: .68rem;
}
.parent-approval-actions {
  display: grid;
  gap: 7px;
  justify-items: end;
}
.success-banner.pending {
  border-color: rgba(240,198,91,.24);
  background: rgba(240,198,91,.08);
}
@media (max-width: 720px) {
  .guardian-approval-unlock { grid-template-columns: 1fr; }
  .parent-approval-list article { grid-template-columns: auto 1fr; }
  .parent-approval-actions {
    grid-column: 1 / -1;
    justify-items: start;
  }
  .guardian-session-chip { align-items:flex-start; flex-wrap:wrap; }
  .guardian-session-chip small { width:100%; margin-left:0; }
}


/* Integrations and delivery health */
.integration-health-admin {
  display: grid;
  gap: 18px;
}
.integration-health-hero {
  display: flex;
  justify-content: space-between;
  gap: 18px;
  align-items: flex-start;
  padding: 24px;
  border: 1px solid rgba(240,198,91,.16);
  border-radius: 22px;
  background: linear-gradient(135deg,#15110a,#101010 60%,#160b0b);
}
.integration-health-hero h2 {
  margin-bottom: 8px;
  font-size: clamp(2rem,4vw,3.2rem);
}
.integration-health-hero p:last-child {
  max-width: 820px;
  margin: 0;
  color: #9b9690;
  line-height: 1.5;
}
.integration-provider-grid {
  display: grid;
  grid-template-columns: repeat(3,minmax(0,1fr));
  gap: 12px;
}
.integration-provider-grid > article {
  padding: 17px;
  border: 1px solid var(--line);
  border-radius: 16px;
  background: #0a0a0a;
}
.integration-provider-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
}
.integration-provider-head span:first-child {
  color: #8f8b85;
  font-size: .64rem;
  font-weight: 850;
  text-transform: uppercase;
}
.integration-provider-head h3 {
  margin: 4px 0 0;
}
.integration-provider-grid dl {
  display: grid;
  gap: 7px;
  margin: 14px 0 0;
}
.integration-provider-grid dl > div {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding-top: 7px;
  border-top: 1px solid var(--line);
}
.integration-provider-grid dt,
.integration-provider-grid dd {
  margin: 0;
  font-size: .72rem;
}
.integration-provider-grid dt {
  color: #77736e;
}
.integration-provider-grid dd {
  color: #d2cdc6;
}
.integration-error {
  margin: 12px 0 0;
  color: #ff8484;
  font-size: .72rem;
  line-height: 1.4;
}
.worker-health-strip {
  display: grid;
  grid-template-columns: repeat(5,1fr);
  gap: 9px;
}
.worker-health-strip > div {
  padding: 13px;
  border: 1px solid var(--line);
  border-radius: 13px;
  background: #090909;
}
.worker-health-strip span,
.worker-health-strip strong {
  display: block;
}
.worker-health-strip span {
  color: #77736e;
  font-size: .63rem;
  text-transform: uppercase;
}
.worker-health-strip strong {
  margin-top: 4px;
  text-transform: capitalize;
}
.worker-run-list {
  display: grid;
  gap: 8px;
  margin-top: 14px;
}
.worker-run-list article {
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 12px;
  align-items: center;
  padding: 11px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: #090909;
}
.worker-run-list strong,
.worker-run-list small {
  display: block;
}
.worker-run-list small {
  color: #77736e;
  font-size: .68rem;
}
.integration-next-steps p:last-child {
  margin-bottom: 0;
  color: #9b9690;
  line-height: 1.55;
}
@media (max-width: 1000px) {
  .integration-provider-grid { grid-template-columns: 1fr; }
  .worker-health-strip { grid-template-columns: repeat(2,1fr); }
}
@media (max-width: 650px) {
  .integration-health-hero { flex-direction: column; }
  .worker-run-list { grid-template-columns: 1fr; }
}


/* Guardian Family Store */
.family-store {
  display: grid;
  gap: 18px;
}
.family-store-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: clamp(28px,4vw,46px);
  border: 1px solid rgba(240,198,91,.15);
  border-radius: 28px;
  background:
    radial-gradient(circle at 90% 10%,rgba(240,198,91,.12),transparent 22rem),
    linear-gradient(135deg,#17120a,#111 58%,#1b0c0c);
}
.family-store-hero h1 {
  margin-bottom: 11px;
  font-size: clamp(2.4rem,5vw,4.5rem);
  line-height: .96;
}
.family-store-hero p:last-child {
  max-width: 760px;
  margin-bottom: 0;
  color: #aaa59e;
  line-height: 1.55;
}
.store-member-chip {
  flex: 0 0 auto;
  min-width: 170px;
  padding: 17px;
  text-align: center;
  border: 1px solid rgba(240,198,91,.18);
  border-radius: 17px;
  background: rgba(240,198,91,.055);
}
.store-member-chip span,
.store-member-chip strong {
  display: block;
}
.store-member-chip span {
  color: #817d77;
  font-size: .66rem;
  font-weight: 850;
  text-transform: uppercase;
  letter-spacing: .07em;
}
.store-member-chip strong {
  margin-top: 5px;
  color: var(--gold);
}
.family-store-layout {
  display: grid;
  grid-template-columns: minmax(0,1fr) 360px;
  gap: 16px;
  align-items: start;
}
.store-return-status {
  margin: 16px 0;
  padding: 18px 20px;
  border: 1px solid rgba(212, 165, 75, .45);
  border-radius: 16px;
  background: rgba(212, 165, 75, .1);
}
.store-return-status strong { color: var(--gold); }
.store-return-status p { margin: 8px 0 0; line-height: 1.5; }
.store-return-status button { margin-top: 12px; }
.store-return-status .button-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.store-catalog,
.store-cart {
  padding: 22px;
  border: 1px solid var(--line);
  border-radius: 22px;
  background: #101010;
}
.store-cart {
  position: sticky;
  top: 100px;
}
.store-product-grid {
  display: grid;
  grid-template-columns: repeat(2,minmax(0,1fr));
  gap: 13px;
}
.store-product-card {
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: 18px;
  background: #090909;
}
.store-product-image {
  position: relative;
  aspect-ratio: 16/10;
  background: #151515;
}
.store-product-image img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  padding: 14px;
}
.store-product-image > span {
  position: absolute;
  top: 10px;
  left: 10px;
  padding: 6px 9px;
  border-radius: 999px;
  color: #17120a;
  background: var(--gold);
  font-size: .62rem;
  font-weight: 900;
  text-transform: uppercase;
}
.store-product-copy {
  padding: 17px;
}
.store-product-copy > span {
  color: #8f8b85;
  font-size: .64rem;
  font-weight: 850;
  text-transform: uppercase;
  letter-spacing: .07em;
}
.store-product-copy h3 {
  margin: 5px 0 7px;
  font-size: 1.3rem;
}
.store-product-copy > p {
  min-height: 44px;
  color: #8f8b85;
  font-size: .77rem;
  line-height: 1.45;
}
.store-product-copy label {
  margin-top: 12px;
}
.store-price-row {
  display: flex;
  justify-content: space-between;
  gap: 13px;
  align-items: center;
  margin-top: 14px;
}
.store-price-row strong,
.store-price-row small {
  display: block;
}
.store-price-row strong {
  font-size: 1.45rem;
}
.store-price-row small {
  margin-top: 3px;
  color: #77736e;
  text-decoration: line-through;
  font-size: .7rem;
}
.store-cart-lines {
  display: grid;
  gap: 9px;
}
.store-cart-lines article {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 12px;
  padding: 12px;
  border: 1px solid var(--line);
  border-radius: 13px;
  background: #090909;
}
.store-cart-lines strong,
.store-cart-lines small,
.store-cart-lines span {
  display: block;
}
.store-cart-lines small,
.store-cart-lines span {
  margin-top: 3px;
  color: #817d77;
  font-size: .69rem;
}
.store-quantity {
  display: flex;
  align-items: center;
  gap: 8px;
}
.store-quantity button {
  display: grid;
  place-items: center;
  width: 29px;
  height: 29px;
  padding: 0;
  border: 1px solid var(--line);
  border-radius: 9px;
  color: white;
  background: #171717;
}
.store-quantity strong {
  min-width: 18px;
  text-align: center;
}
.store-promo {
  margin-top: 14px;
}
.store-total-preview,
.store-server-total {
  display: grid;
  gap: 4px;
  margin-top: 14px;
  padding: 14px;
  border: 1px solid var(--line);
  border-radius: 13px;
  background: #090909;
}
.store-server-total {
  border-color: rgba(111,184,121,.22);
  background: rgba(68,126,76,.07);
}
.store-total-preview span,
.store-server-total span {
  color: #817d77;
  font-size: .67rem;
  text-transform: uppercase;
}
.store-total-preview strong,
.store-server-total strong {
  font-size: 1.65rem;
}
.store-total-preview small,
.store-server-total small {
  color: #77736e;
  line-height: 1.4;
}
.store-checkout-button {
  width: 100%;
  margin-top: 14px;
}
@media (max-width: 1050px) {
  .family-store-layout { grid-template-columns: 1fr; }
  .store-cart { position: static; }
}
@media (max-width: 720px) {
  .family-store-hero {
    align-items: flex-start;
    flex-direction: column;
  }
  .store-member-chip {
    min-width: 0;
    width: 100%;
  }
  .store-product-grid { grid-template-columns: 1fr; }
}


/* Commerce readiness */
.commerce-readiness-grid {
  display: grid;
  grid-template-columns: repeat(4,minmax(0,1fr));
  gap: 9px;
}
.commerce-readiness-grid > div {
  padding: 13px;
  border: 1px solid var(--line);
  border-radius: 13px;
  background: #090909;
}
.commerce-readiness-grid span,
.commerce-readiness-grid strong {
  display: block;
}
.commerce-readiness-grid span {
  color: #77736e;
  font-size: .62rem;
  text-transform: uppercase;
  letter-spacing: .05em;
}
.commerce-readiness-grid strong {
  margin-top: 5px;
  font-size: 1.4rem;
  text-transform: capitalize;
}
.commerce-webhook-list {
  display: grid;
  gap: 8px;
  margin-top: 14px;
}
.commerce-webhook-list article {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 12px;
  align-items: center;
  padding: 11px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: #090909;
}
.commerce-webhook-list strong,
.commerce-webhook-list small {
  display: block;
}
.commerce-webhook-list small {
  margin-top: 3px;
  color: #77736e;
  font-size: .67rem;
}
@media (max-width: 900px) {
  .commerce-readiness-grid { grid-template-columns: repeat(2,1fr); }
}
@media (max-width: 560px) {
  .commerce-readiness-grid { grid-template-columns: 1fr; }
}


/* Production Launch Gate */
.launch-gate-admin{display:grid;gap:18px}
.launch-gate-recheck{justify-self:start}
.launch-gate-hero{display:flex;justify-content:space-between;gap:24px;align-items:center;padding:28px;border-radius:24px;border:1px solid var(--line)}
.launch-gate-hero.blocked{border-color:rgba(239,52,52,.26);background:radial-gradient(circle at 92% 10%,rgba(198,40,40,.14),transparent 21rem),linear-gradient(135deg,#1c0d0d,#111 62%)}
.launch-gate-hero.ready{border-color:rgba(111,184,121,.24);background:radial-gradient(circle at 92% 10%,rgba(68,126,76,.14),transparent 21rem),linear-gradient(135deg,#0d180f,#111 62%)}
.launch-gate-hero h2{margin-bottom:9px;font-size:clamp(2.1rem,4vw,3.5rem)}
.launch-gate-hero p:last-child{max-width:860px;margin:0;color:#9f9a93;line-height:1.55}
.launch-gate-score{flex:0 0 auto;text-align:center;min-width:145px}
.launch-gate-score strong,.launch-gate-score span{display:block}
.launch-gate-score strong{font-size:2.8rem;line-height:1}
.launch-gate-score span{margin-top:6px;color:#817d77;font-size:.67rem;text-transform:uppercase}
.launch-gate-summary{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.launch-gate-summary article{padding:17px;border:1px solid var(--line);border-radius:16px;background:#0a0a0a}
.launch-gate-summary article.bad{border-color:rgba(239,52,52,.25);background:rgba(198,40,40,.07)}
.launch-gate-summary article.warn{border-color:rgba(240,198,91,.20);background:rgba(240,198,91,.045)}
.launch-gate-summary article.good{border-color:rgba(111,184,121,.18)}
.launch-gate-summary span,.launch-gate-summary strong,.launch-gate-summary small{display:block}
.launch-gate-summary span{color:#817d77;font-size:.66rem;font-weight:850;text-transform:uppercase}
.launch-gate-summary strong{margin:5px 0 3px;font-size:2rem}
.launch-gate-summary small{color:#77736e}
.launch-priority-list,.launch-warning-list{display:grid;gap:9px}
.launch-priority-list article{padding:14px;border:1px solid rgba(239,52,52,.22);border-radius:14px;background:rgba(198,40,40,.065)}
.launch-priority-list span{color:#ff7474;font-size:.62rem;font-weight:900;letter-spacing:.07em}
.launch-priority-list h3{margin:5px 0 6px}
.launch-priority-list p,.launch-warning-list p{margin:0;color:#98938c;font-size:.76rem;line-height:1.45}
.launch-warning-list article{display:grid;grid-template-columns:minmax(180px,.55fr) 1fr;gap:14px;padding:12px;border:1px solid rgba(240,198,91,.17);border-radius:12px;background:rgba(240,198,91,.035)}
.launch-warning-list strong,.launch-warning-list small{display:block}
.launch-warning-list small{margin-top:3px;color:#77736e}
.launch-gate-areas{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
.launch-gate-areas>article{padding:17px;border:1px solid var(--line);border-radius:16px;background:#0a0a0a}
.launch-area-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;margin-bottom:12px}
.launch-area-head span{color:#817d77;font-size:.62rem;font-weight:850;text-transform:uppercase}
.launch-area-head h3{margin:4px 0 0}
.launch-area-head>strong{font-size:1.35rem}
.launch-area-checks{display:grid;gap:7px}
.launch-area-checks>div{display:grid;grid-template-columns:auto 1fr;gap:9px;padding:10px;border:1px solid var(--line);border-radius:11px;background:#111}
.launch-area-checks>div>span{display:grid;place-items:center;width:25px;height:25px;border-radius:8px;font-weight:900}
.launch-area-checks .pass>span{color:#a7d4af;background:rgba(68,126,76,.12)}
.launch-area-checks .fail>span{color:#ff8585;background:rgba(198,40,40,.12)}
.launch-area-checks .warning>span{color:var(--gold);background:rgba(240,198,91,.10)}
.launch-area-checks strong,.launch-area-checks small{display:block}
.launch-area-checks small{margin-top:3px;color:#77736e;line-height:1.35}
.launch-gate-note p:last-child{margin-bottom:0;color:#99948d;line-height:1.55}
@media (max-width:850px){.launch-gate-areas{grid-template-columns:1fr}}
@media (max-width:650px){.launch-gate-hero{flex-direction:column;align-items:flex-start}.launch-gate-score{text-align:left}.launch-gate-summary{grid-template-columns:1fr}.launch-warning-list article{grid-template-columns:1fr}}


/* Public leads and inquiries */
.leads-admin {
  display: grid;
  gap: 18px;
}
.leads-summary-grid {
  display: grid;
  grid-template-columns: repeat(3,minmax(0,1fr));
  gap: 10px;
}
.leads-summary-grid article {
  padding: 18px;
  border: 1px solid var(--line);
  border-radius: 16px;
  background: #0a0a0a;
}
.leads-summary-grid span,
.leads-summary-grid strong,
.leads-summary-grid small {
  display: block;
}
.leads-summary-grid span,
.leads-summary-grid small {
  color: #817d77;
  font-size: .66rem;
  text-transform: uppercase;
  letter-spacing: .05em;
}
.leads-summary-grid strong {
  margin: 5px 0;
  font-size: 2rem;
}
.lead-record-list {
  display: grid;
  gap: 9px;
}
.lead-record {
  display: grid;
  grid-template-columns: minmax(0,1fr) auto minmax(150px,190px);
  gap: 14px;
  align-items: start;
  padding: 14px;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: #090909;
}
.lead-record.inquiry {
  grid-template-columns: minmax(0,1fr) minmax(150px,190px);
}
.lead-record-main > span {
  color: #ff6a6a;
  font-size: .63rem;
  font-weight: 850;
  text-transform: uppercase;
}
.lead-record-main h3 {
  margin: 4px 0 2px;
}
.lead-record-main a {
  color: var(--gold);
  font-size: .78rem;
}
.lead-record-main p {
  margin: 8px 0 0;
  color: #9b9690;
  line-height: 1.45;
  font-size: .78rem;
}
.lead-record-main small,
.lead-record-consent small {
  display: block;
  margin-top: 7px;
  color: #77736e;
  font-size: .68rem;
}
.lead-record-consent {
  min-width: 160px;
}
@media (max-width: 850px) {
  .leads-summary-grid { grid-template-columns: 1fr; }
  .lead-record,
  .lead-record.inquiry { grid-template-columns: 1fr; }
}


/* Safe provider integration tests */
.integration-test-box {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
  margin-top: 13px;
  padding-top: 12px;
  border-top: 1px solid var(--line);
}
.integration-test-box span,
.integration-test-box strong,
.integration-test-box small {
  display: block;
}
.integration-test-box span {
  color: #77736e;
  font-size: .61rem;
  font-weight: 850;
  text-transform: uppercase;
}
.integration-test-box strong {
  margin-top: 3px;
  text-transform: capitalize;
}
.integration-test-box small {
  max-width: 260px;
  margin-top: 4px;
  color: #817d77;
  font-size: .67rem;
  line-height: 1.35;
}
.integration-test-box .integration-error {
  color: #ff8585;
}
/* Private digital book reader. Preserve original page and spread proportions. */
.digital-book-entry { margin: 1rem 0; }
.digital-book-reader { width: min(1100px, 96vw); max-height: 94dvh; padding: clamp(12px, 2vw, 28px); }
.digital-reader-header, .digital-reader-controls { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.digital-reader-header h2 { margin: 0 0 12px; font-size: clamp(1.2rem, 3vw, 1.8rem); }
.digital-reader-controls { padding: 12px 0; }
.digital-reader-controls select { min-height: 44px; padding: 6px; }
.digital-reader-status { min-height: 1.5em; }
.digital-reader-page { overflow: auto; max-height: 64dvh; background: #f0eee8; border-radius: 8px; text-align: center; }
.digital-reader-page img { display: block; margin: auto; width: auto; height: auto; max-width: 100%; max-height: 64dvh; object-fit: contain; }
.digital-reader-page.enlarged img { width: 150%; max-width: none; max-height: none; }
.digital-reader-page:focus-visible { outline: 3px solid #b9202c; outline-offset: 2px; }
.digital-reader-page { touch-action: pan-y pinch-zoom; }
.digital-reader-page.enlarged { touch-action: auto; }
.digital-reader-help { font-size: .875rem; line-height: 1.5; }
.digital-reader-text { margin-top: 16px; padding: 20px; border: 1px solid var(--line); border-radius: 12px; background: var(--panel); }
.digital-reader-text p { white-space: pre-wrap; font-size: clamp(1.1rem, 2vw, 1.35rem); line-height: 1.7; overflow-wrap: anywhere; }
.digital-reader-controls button { min-height: 44px; }
.digital-book-preparation { grid-column: 1 / -1; }
.digital-book-preparation > label { display: block; margin: 16px 0; }
.digital-book-preparation textarea { display: block; width: 100%; }
.digital-upload-preview { display: block; max-width: 100%; max-height: 480px; margin: 16px auto; object-fit: contain; }
/* Guardian-owned reading history stays separate from completion awards. */
.child-reading-history { margin-top: 1.5rem; border-top: 1px solid #dbe3ee; padding-top: 1rem; }
.child-reading-history ul { list-style: none; padding: 0; display: grid; gap: .75rem; }
.child-reading-history li { display: grid; gap: .25rem; padding: .85rem; background: #f3f6fa; border-radius: .75rem; overflow-wrap: anywhere; }
.child-reading-history li span { font-size: .9rem; color: #42536a; }
