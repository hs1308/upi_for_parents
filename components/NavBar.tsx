"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Section } from "@/lib/notifications";

const tabs: { href: string; label: string; section: Section | null }[] = [
  { href: "/", label: "Home", section: null },
  { href: "/requests", label: "Requests", section: "requests" },
  { href: "/requests/sent", label: "Sent", section: "sent" },
  { href: "/friends", label: "Friends", section: "friends" },
];

export default function NavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [badges, setBadges] = useState<Record<Section, boolean>>({
    requests: false,
    sent: false,
    friends: false,
  });

  const refreshBadges = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: seenRows } = await supabase
      .from("upi_seen_state")
      .select("section, last_seen_at")
      .eq("user_id", user.id);

    const lastSeen: Record<Section, string> = {
      requests: "1970-01-01",
      sent: "1970-01-01",
      friends: "1970-01-01",
    };
    (seenRows ?? []).forEach((row: any) => {
      lastSeen[row.section as Section] = row.last_seen_at;
    });

    const [incoming, sent, friendReqs] = await Promise.all([
      supabase
        .from("upi_payment_requests")
        .select("id", { count: "exact", head: true })
        .eq("payer_id", user.id)
        .eq("status", "pending")
        .gt("created_at", lastSeen.requests),
      supabase
        .from("upi_payment_requests")
        .select("id", { count: "exact", head: true })
        .eq("requester_id", user.id)
        .neq("status", "pending")
        .gt("updated_at", lastSeen.sent),
      supabase
        .from("upi_friendships")
        .select("id", { count: "exact", head: true })
        .eq("addressee_id", user.id)
        .eq("status", "pending")
        .gt("created_at", lastSeen.friends),
    ]);

    setBadges({
      requests: (incoming.count ?? 0) > 0,
      sent: (sent.count ?? 0) > 0,
      friends: (friendReqs.count ?? 0) > 0,
    });
  }, [supabase]);

  useEffect(() => {
    refreshBadges();
    const channel = supabase
      .channel("upi_nav_badges")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "upi_payment_requests" },
        () => refreshBadges()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "upi_friendships" },
        () => refreshBadges()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // refresh again whenever the person navigates, so a dot clears promptly
    // after visiting that tab.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshBadges, pathname]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="sticky top-0 z-10 bg-white border-b border-gray-200">
      <div className="flex items-center justify-between px-4 py-2">
        <span className="font-semibold text-brand-700">UPI for Parents</span>
        <button
          onClick={handleLogout}
          className="text-sm text-gray-500 underline"
        >
          Log out
        </button>
      </div>
      <nav className="flex">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={`relative flex-1 text-center py-2 text-sm font-medium border-b-2 ${
              pathname === tab.href
                ? "border-brand-600 text-brand-700"
                : "border-transparent text-gray-500"
            }`}
          >
            {tab.label}
            {tab.section && badges[tab.section] && (
              <span className="absolute top-1 right-1/4 translate-x-2 w-2 h-2 rounded-full bg-red-500" />
            )}
          </Link>
        ))}
      </nav>
    </div>
  );
}
