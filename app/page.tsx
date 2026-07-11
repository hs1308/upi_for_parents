import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import NavBar from "@/components/NavBar";

export default async function HomePage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null; // middleware handles the redirect to /login
  }

  const { data: friendships } = await supabase
    .from("upi_friendships")
    .select("requester_id, addressee_id")
    .eq("status", "accepted")
    .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

  const friendIds = Array.from(
    new Set(
      (friendships ?? []).map((f) =>
        f.requester_id === user.id ? f.addressee_id : f.requester_id
      )
    )
  );

  const { data: friends } = friendIds.length
    ? await supabase
        .from("upi_profiles")
        .select("id, display_name, photo_url")
        .in("id", friendIds)
    : { data: [] as any[] };

  const hasFriends = (friends ?? []).length > 0;

  return (
    <div>
      <NavBar />

      <div className="px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold">Who do you need to pay?</h1>
          {hasFriends && (
            <Link
              href="/friends"
              className="text-sm font-medium text-brand-700 border border-brand-600 rounded-full px-3 py-1"
            >
              + Add friend
            </Link>
          )}
        </div>

        {!hasFriends ? (
          <div className="text-center mt-16">
            <p className="text-gray-500 mb-6">
              You haven&apos;t added anyone yet. Add someone you trust so you
              can ask them to pay for you.
            </p>
            <Link
              href="/friends"
              className="inline-block bg-brand-600 text-white rounded-lg px-6 py-3 font-semibold"
            >
              + Add your first friend
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {friends!.map((friend) => (
              <Link
                key={friend.id}
                href={`/request/new/${friend.id}`}
                className="flex flex-col items-center gap-2"
              >
                <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-200 border-2 border-brand-100">
                  {friend.photo_url ? (
                    <Image
                      src={friend.photo_url}
                      alt={friend.display_name}
                      width={80}
                      height={80}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-gray-500">
                      {friend.display_name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <span className="text-sm text-center font-medium">
                  {friend.display_name}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
