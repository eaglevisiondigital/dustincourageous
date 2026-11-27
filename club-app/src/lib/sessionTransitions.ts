// Only preserve UI state for routine events belonging to the same adult account.
// This never grants access; database authorization still applies to every request.
export function preservesFamilyWorkspace(currentUserId: string | null, nextUserId: string | null, event: string): boolean {
  return Boolean(currentUserId && nextUserId && currentUserId === nextUserId)
    && ["TOKEN_REFRESHED", "USER_UPDATED", "SIGNED_IN"].includes(event);
}
