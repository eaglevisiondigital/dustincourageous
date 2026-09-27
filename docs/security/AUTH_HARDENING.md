# Password hardening — current hosted status and historical implementation

**Current hosted status: enabled.** September 26, 2026 Work verification,
as supplied by PRIMARY CHAT in the provider-handoff assignment, confirmed that
leaked-password protection is enabled and its Security Advisor warning cleared.
This is externally verified hosted configuration, not inferred from local tests.
Codex did not modify Auth configuration in this handoff package.

## Historical Codex hardening scope

Chat approved enabling leaked-password protection only on
`vrixketvinzhsfwwcqiu` (Dustin Courageous Adventure Club).

**Not enabled by the original Codex hardening package.** The installed Supabase connector exposes
SQL/migration/advisor tools, but no Auth-configuration read/write operation.
The dedicated project settings page redirects the available browser session to
Supabase dashboard sign-in. No dashboard credentials or management token were
requested, copied or extracted. No Auth configuration has been changed.

## Supported setting and behavior

The official [Management API operation](https://supabase.com/docs/reference/api/v1-update-auth-service-config)
is `PATCH /v1/projects/vrixketvinzhsfwwcqiu/config/auth` with the single-field body
`{"password_hibp_enabled":true}`. It requires authorized Auth-config/project-admin
write access. Do not send an entire copied configuration body or log an Auth
configuration response, since other fields can contain secrets.

[Supabase password security](https://supabase.com/docs/guides/auth/password-security)
documents breached-password rejection and Pro-plan-or-higher availability.
New signups and password changes are checked. Recovery uses the same password
update API after a recovery session is established, so the new password is checked
there too. Requesting a recovery email itself does not choose a new password.
Existing users can still sign in; the pinned Supabase JS 2.117.1 Auth client
returns a successful session plus an optional `data.weakPassword` advisory.
It does not turn that advisory into a failed sign-in. The application retains
successful-session behavior and does not force a new reset policy.

`authFeedback` now recognizes `weak_password` with a `pwned` reason and offers a
unique-password retry without claiming that this user's account was breached.
Other weak-password reasons receive safe generic guidance without inventing an
exact configured minimum. Raw server/URL messages are not displayed.

## What was tested

- 282 application tests, including leaked-password reason handling and unknown
  weak-password reasons; existing signup/reset forms use the shared feedback.
- Actual isolated Auth signup and password sign-in for four synthetic adults.
- HTTP weak-password update rejection, strong-password update/new sign-in, and
  recovery-token verification followed by password reset.
- Local HTTP rejection uses Auth's raw `error_code`; Supabase JS normalizes that
  to `error.code` for the application.

The disposable local instance disables email confirmation solely to avoid sending
emails during synthetic signup. This does not change hosted Auth configuration.
The local test does **not** prove hosted HIBP service activation or an end-to-end
real email delivery journey. No hosted users or credentials were changed.

## Historical action — subsequently completed by Work verification

In the authorized signed-in dashboard, open
[the Dustin email Auth settings](https://supabase.com/dashboard/project/vrixketvinzhsfwwcqiu/auth/providers?provider=Email),
verify the project reference, enable leaked-password protection, and save that
setting only. If it requires a paid-plan change, return that billing decision to
Chat; this package authorizes no plan purchase. Alternatively, an authorized
operator can use the single-field Management API patch above.

Read the setting back and rerun the security advisor to verify that the disabled
leaked-password warning clears. Do not change providers, sessions, MFA, SMTP,
password length/character requirements, current-password requirements or redirects.
Record the verified status in CURRENT_BUILD_STATE.md and the hardening report.
