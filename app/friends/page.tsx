"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { markSectionSeen } from "@/lib/notifications";
import NavBar from "@/components/NavBar";

type Profile = {
  id: string;
  username: string;
  display_name: string;
  photo_url: string | null;
};

type FriendshipRow = {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: "pending" | "accepted" | "declined";
};

export default function FriendsPage() {
  const supabase = createClient();
  const [meId, setMeId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [searchResult, setSearchResult] = useState<Profile | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [incoming, setIncoming] = useState<
    (FriendshipRow & { profile: Profile })[]
  >([]);
  const [outgoing, setOutgoing] = useState<
    (FriendshipRow & { profile: Profile })[]
  >([]);
  const [accepted, setAccepted] = useState<
    (FriendshipRow & { profile: Profile })[]
  >([]);
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    setMeId(user.id);

    const { data: rows } = await supabase
      .from("upi_friendships")
      .select("id, requester_id, addressee_id, status")
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

    const all = (rows ?? []) as FriendshipRow[];
    const otherIds = Array.from(
      new Set(
        all.map((r) => (r.requester_id === user.id ? r.addressee_id : r.requester_id))
      )
    );

    const { data: profiles } = otherIds.length
      ? await supabase
          .from("upi_profiles")
          .select("id, username, display_name, photo_url")
          .in("id", otherIds)
      : { data: [] as Profile[] };

    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

    const withProfile = all
      .map((r) => {
        const otherId = r.requester_id === user.id ? r.addressee_id : r.requester_id;
        const profile = profileMap.get(otherId);
        return profile ? { ...r, profile } : null;
      })
      .filter((r): r is FriendshipRow & { profile: Profile } => r !== null);

    setIncoming(
      withProfile.filter((r) => r.status === "pending" && r.addressee_id === user.id)
    );
    setOutgoing(
      withProfile.filter((r) => r.status === "pending" && r.requester_id === user.id)
    );
    setAccepted(withProfile.filter((r) => r.status === "accepted"));
    setLoading(false);
    markSectionSeen("friends");
  }, [supabase]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearchError(null);
    setSearchResult(null);
    const uname = search.trim().toLowerCase();
    if (!uname) return;

    const { data, error } = await supabase
      .from("upi_profiles")
      .select("id, username, display_name, photo_url")
      .eq("username", uname)
      .maybeSingle();

    if (error || !data) {
      setSearchError("No one found with that username.");
      return;
    }
    if (data.id === meId) {
      setSearchError("That's you!");
      return;
    }
    setSearchResult(data);
  }

  async function sendRequest(addresseeId: string) {
    if (!meId) return;
    await supabase.from("upi_friendships").insert({
      requester_id: meId,
      addressee_id: addresseeId,
      status: "pending",
    });
    setSearchResult(null);
    setSearch("");
    loadAll();
  }

  async function respond(friendshipId: string, status: "accepted" | "declined") {
    await supabase.from("upi_friendships").update({ status }).eq("id", friendshipId);
    loadAll();
  }

  return (
    <div>
      <NavBar />
      <div className="px-4 py-6 space-y-8">
        <section>
          <h2 className="font-semibold mb-2">Add a friend</h2>
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Enter their username"
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2"
              autoCapitalize="none"
            />
            <button
              type="submit"
              className="bg-brand-600 text-white rounded-lg px-4 py-2 font-medium"
            >
              Search
            </button>
          </form>
          {searchError && (
            <p className="text-sm text-red-600 mt-2">{searchError}</p>
          )}
          {searchResult && (
            <div className="mt-3 flex items-center justify-between bg-white rounded-lg border border-gray-200 p-3">
              <div className="flex items-center gap-3">
                <Avatar profile={searchResult} />
                <span className="font-medium">{searchResult.display_name}</span>
              </div>
              <button
                onClick={() => sendRequest(searchResult.id)}
                className="text-sm bg-brand-600 text-white rounded-full px-3 py-1"
              >
                Send request
              </button>
            </div>
          )}
        </section>

        {incoming.length > 0 && (
          <section>
            <h2 className="font-semibold mb-2">Friend requests</h2>
            <div className="space-y-2">
              {incoming.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between bg-white rounded-lg border border-gray-200 p-3"
                >
                  <div className="flex items-center gap-3">
                    <Avatar profile={r.profile} />
                    <span className="font-medium">{r.profile.display_name}</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => respond(r.id, "accepted")}
                      className="text-sm bg-brand-600 text-white rounded-full px-3 py-1"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => respond(r.id, "declined")}
                      className="text-sm text-gray-500 border border-gray-300 rounded-full px-3 py-1"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {outgoing.length > 0 && (
          <section>
            <h2 className="font-semibold mb-2">Requests you sent</h2>
            <div className="space-y-2">
              {outgoing.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center gap-3 bg-white rounded-lg border border-gray-200 p-3"
                >
                  <Avatar profile={r.profile} />
                  <span className="font-medium">{r.profile.display_name}</span>
                  <span className="ml-auto text-xs text-gray-400">Pending</span>
                </div>
              ))}
            </div>
          </section>
        )}

        <section>
          <h2 className="font-semibold mb-2">Your friends</h2>
          {loading ? (
            <p className="text-gray-400 text-sm">Loading…</p>
          ) : accepted.length === 0 ? (
            <p className="text-gray-400 text-sm">No friends yet.</p>
          ) : (
            <div className="space-y-2">
              {accepted.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center gap-3 bg-white rounded-lg border border-gray-200 p-3"
                >
                  <Avatar profile={r.profile} />
                  <span className="font-medium">{r.profile.display_name}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Avatar({ profile }: { profile: Profile }) {
  return (
    <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
      {profile.photo_url ? (
        <Image
          src={profile.photo_url}
          alt={profile.display_name}
          width={40}
          height={40}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center font-bold text-gray-500">
          {profile.display_name.charAt(0).toUpperCase()}
        </div>
      )}
    </div>
  );
}
