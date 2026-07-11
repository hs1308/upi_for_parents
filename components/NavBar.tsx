"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const tabs = [
  { href: "/", label: "Home" },
  { href: "/requests", label: "Requests" },
  { href: "/requests/sent", label: "Sent" },
  { href: "/friends", label: "Friends" },
];

export default function NavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

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
            className={`flex-1 text-center py-2 text-sm font-medium border-b-2 ${
              pathname === tab.href
                ? "border-brand-600 text-brand-700"
                : "border-transparent text-gray-500"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
