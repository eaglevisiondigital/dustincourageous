import type { User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { LeaderGroupsHub } from "./LeaderGroupsHub";

const shieldUrl = "https://dustincourageous.com/assets/images/dc-shield.jpeg";

function Brand() {
  return (
    <div className="brand">
      <img src={shieldUrl} alt="Dustin Courageous DC Shield" />
      <div>
        <strong>Dustin Courageous</strong>
        <span>Adventure Club Leader Hub</span>
      </div>
    </div>
  );
}

export function LeaderOnlyPortal({
  user,
  adminRole,
  onAdmin
}: {
  user: User;
  adminRole: string | null;
  onAdmin: () => void;
}) {
  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <div className="app-shell leader-only-shell">
      <header className="app-header">
        <Brand />
        <div className="header-actions">
          {adminRole && (
            <button className="text-button small" onClick={onAdmin}>
              Courageous Kids Admin
            </button>
          )}
          <button className="text-button small" onClick={() => void signOut()}>
            Sign out
          </button>
        </div>
      </header>

      <main className="leader-only-main">
        <section className="leader-only-hero">
          <div>
            <p className="eyebrow gold">Approved Adult Access</p>
            <h1>Adventure Club Leader Hub</h1>
            <p>
              Manage the groups you have been approved to lead. Child roster visibility stays intentionally limited to the group experience.
            </p>
          </div>
          <div className="leader-account-chip">
            <span>Signed in as</span>
            <strong>{user.email}</strong>
          </div>
        </section>

        <LeaderGroupsHub />
      </main>
    </div>
  );
}
