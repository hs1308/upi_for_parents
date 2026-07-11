import { createClient } from "@/lib/supabase/client";

export type Section = "requests" | "sent" | "friends";

// Marks a nav section as "seen" right now for the current user — call this
// when the person actually opens that tab, to clear its red dot.
export async function markSectionSeen(section: Section) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("upi_seen_state").upsert(
    {
      user_id: user.id,
      section,
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: "user_id,section" }
  );
}
