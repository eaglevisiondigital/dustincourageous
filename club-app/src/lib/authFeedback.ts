type AuthProblem = { code?: string; status?: number; message?: string };
export function authIsRateLimited(error: AuthProblem): boolean {
  return error.status === 429 || error.code === "over_email_send_rate_limit" || error.code === "over_request_rate_limit";
}
export function authFeedback(error: AuthProblem): string {
  if (authIsRateLimited(error)) return "Too many requests were made. Please wait before trying again. For email links, check your email spelling, inbox and spam folder. Email delivery may remain limited for a while.";
  if (error.code === "email_not_confirmed") return "Confirm your email before signing in. Check your inbox and spam folder, or request another confirmation email below.";
  if (error.code === "invalid_credentials") return "The email or password was not accepted. Check your email spelling and password, or use Forgot Password.";
  if (error.code === "weak_password") return "Choose a stronger password with at least 8 characters, including uppercase and lowercase letters, numbers and symbols.";
  if (error.code === "signup_disabled" || error.code === "email_provider_disabled") return "New email accounts are temporarily unavailable. Please try again later.";
  return "We could not complete that request. Check your details and connection, then try again. If the problem continues, try again later.";
}
export function emailRetrySeconds(deadline: number, now: number): number {
  return Math.max(0, Math.ceil((deadline - now) / 1000));
}
