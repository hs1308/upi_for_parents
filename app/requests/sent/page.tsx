"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import NavBar from "@/components/NavBar";

type Profile = {
  id: string;
  display_name: string;
  photo_url: string | null;
};

type PaymentRequest = {
  id: string;
  requester_id: string;
  payer_id: string;
  qr_image_url: string | null;
  upi_id: string | null;
  payee_name: string | null;
  amount: number;
  status: "pending" | "paid" | "cancelled";
  proof_screenshot_url: string | null;
  created_at: string;
  payer?: Profile;
};

export default function SentRequestsPage() {
  const supabase = createClient();
  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: rows } = await supabase
      .from("upi_payment_requests")
      .select("*")
      .eq("requester_id", user.id)
      .order("created_at", { ascending: false });

    const list = (rows ?? []) as PaymentRequest[];
    const payerIds = Array.from(new Set(list.map((r) => r.payer_id)));
    const { data: profiles } = payerIds.length
      ? await supabase
          .from("upi_profiles")
          .select("id, display_name, photo_url")
          .in("id", payerIds)
      : { data: [] as Profile[] };
    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

    setRequests(list.map((r) => ({ ...r, payer: profileMap.get(r.payer_id) })));
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
    const channel = supabase
      .channel("upi_payment_requests_requester")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "upi_payment_requests" },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load, supabase]);

  return (
    <div>
      <NavBar />
      <div className="px-4 py-6 space-y-4">
        <h1 className="text-xl font-bold mb-2">Your requests</h1>

        {loading ? (
          <p className="text-gray-400 text-sm">Loading…</p>
        ) : requests.length === 0 ? (
          <p className="text-gray-400 text-sm">
            You haven&apos;t asked anyone to pay yet.
          </p>
        ) : (
          requests.map((req) => (
            <div
              key={req.id}
              className="bg-white rounded-lg border border-gray-200 p-4 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">
                  {req.payer?.display_name ?? "Someone"}
                </span>
                <span className="text-lg font-bold">₹{req.amount}</span>
              </div>

              {req.status === "pending" && (
                <p className="inline-block text-sm font-semibold text-amber-700 bg-amber-100 rounded-full px-3 py-1">
                  Waiting for payment…
                </p>
              )}

              {req.status === "paid" && (
                <div className="space-y-2">
                  <p className="inline-block text-sm font-semibold text-green-700 bg-green-100 rounded-full px-3 py-1">
                    ✅ Paid
                  </p>
                  {req.proof_screenshot_url && (
                    <div>
                      <p className="text-sm text-gray-500 mb-1">
                        Show this to the shop if needed:
                      </p>
                      <Image
                        src={req.proof_screenshot_url}
                        alt="Payment confirmation"
                        width={300}
                        height={400}
                        className="w-full rounded-lg border border-gray-200"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
