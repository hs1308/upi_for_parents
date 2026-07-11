// Supabase Auth is email/password based. We want a plain username + password
// experience (no real email needed), so we map usernames to a synthetic,
// never-emailed address under a fixed fake domain. This is purely an
// implementation detail — users never see or type an "email".
export function usernameToFakeEmail(username: string) {
  const normalized = username.trim().toLowerCase();
  return `${normalized}@upi-for-mom.local`;
}
