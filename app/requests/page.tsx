"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { buildUpiPayLink } from "@/lib/upi";
import { markSectionSeen } from "@/lib/notifications";
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
  status: "pending" | "paid" | "cancelled" | "declined";
  proof_screenshot_url: string | null;
  created_at: string;
  requester?: Profile;
};

export default function IncomingRequestsPage() {
  const supabase = createClient();
  const [meId, setMeId] = useState<string | null>(null);
  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  const [decliningId, setDecliningId] = useState<string | null>(null);
  const fileInputsRef = useRef<Record<string, HTMLInputElement | null>>({});

  const load = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    setMeId(user.id);

    const { data: rows } = await supabase
      .from("upi_payment_requests")
      .select("*")
      .eq("payer_id", user.id)
      .order("created_at", { ascending: false });

    const list = (rows ?? []) as PaymentRequest[];
    const requesterIds = Array.from(new Set(list.map((r) => r.requester_id)));
    const { data: profiles } = requesterIds.length
      ? await supabase
          .from("upi_profiles")
          .select("id, display_name, photo_url")
          .in("id", requesterIds)
      : { data: [] as Profile[] };
    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

    setRequests(
      list.map((r) => ({ ...r, requester: profileMap.get(r.requester_id) }))
    );
    setLoading(false);
    markSectionSeen("requests");
  }, [supabase]);

  useEffect(() => {
    load();
    const channel = supabase
      .channel("upi_payment_requests_payer")
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

  function handlePay(req: PaymentRequest) {
    if (!req.upi_id) return;
    const link = buildUpiPayLink({
      upiId: req.upi_id,
      payeeName: req.payee_name,
      amount: Number(req.amount),
    });
    window.location.href = link;
  }

  async function handleDecline(req: PaymentRequest) {
    const confirmed = window.confirm(
      "Are you sure you want to decline this request? The person will be notified."
    );
    if (!confirmed) return;

    setDecliningId(req.id);
    try {
      await supabase
        .from("upi_payment_requests")
        .update({ status: "declined" })
        .eq("id", req.id);
      load();
    } finally {
      setDecliningId(null);
    }
  }

  async function handleMarkPaid(req: PaymentRequest, file: File | null) {
    setUploadingFor(req.id);
    try {
      let proofUrl: string | null = null;
      if (file) {
        const path = `${meId}/${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from("upi-proofs")
          .upload(path, file);
        if (!uploadError) {
          const { data: publicUrl } = supabase.storage
            .from("upi-proofs")
            .getPublicUrl(path);
          proofUrl = publicUrl.publicUrl;
        }
      }

      await supabase
        .from("upi_payment_requests")
        .update({
          status: "paid",
          proof_screenshot_url: proofUrl,
          paid_at: new Date().toISOString(),
        })
        .eq("id", req.id);

      load();
    } finally {
      setUploadingFor(null);
    }
  }

  const pending = requests.filter((r) => r.status === "pending");
  const done = requests.filter((r) => r.status !== "pending");

  return (
    <div>
      <NavBar />
      <div className="px-4 py-6 space-y-8">
        <section>
          <h2 className="font-semibold mb-2">Needs your action</h2>
          {loading ? (
            <p className="text-gray-400 text-sm">Loading…</p>
          ) : pending.length === 0 ? (
            <p className="text-gray-400 text-sm">Nothing pending. 🎉</p>
          ) : (
            <div className="space-y-4">
              {pending.map((req) => (
                <div
                  key={req.id}
                  className="bg-white rounded-lg border border-gray-200 p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">
                      {req.requester?.display_name ?? "Someone"} needs you to
                      pay
                    </span>
                    <span className="text-lg font-bold">₹{req.amount}</span>
                  </div>
                  <p className="text-sm text-gray-500">
                    UPI ID / phone: {req.upi_id || "not detected"}
                    {req.payee_name ? ` · ${req.payee_name}` : ""}
                  </p>
                  {req.qr_image_url && (
                    <a
                      href={req.qr_image_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-brand-700 underline"
                    >
                      View original photo
                    </a>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => handlePay(req)}
                      className="flex-1 bg-brand-600 text-white rounded-lg py-3 font-semibold"
                    >
                      Pay now
                    </button>
                    <button
                      onClick={() => handleDecline(req)}
                      disabled={decliningId === req.id}
                      className="text-sm text-red-600 border border-red-300 rounded-lg px-4 py-3 font-medium disabled:opacity-50"
                    >
                      {decliningId === req.id ? "…" : "Decline"}
                    </button>
                  </div>

                  <div>
                    <input
                      ref={(el) => {
                        fileInputsRef.current[req.id] = el;
                      }}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) =>
                        handleMarkPaid(req, e.target.files?.[0] ?? null)
                      }
                    />
                    <button
                      onClick={() => fileInputsRef.current[req.id]?.click()}
                      disabled={uploadingFor === req.id}
                      className="w-full border border-gray-300 rounded-lg py-2 text-sm font-medium disabled:opacity-50"
                    >
                      {uploadingFor === req.id
                        ? "Saving…"
                        : "Mark as paid (add screenshot)"}
                    </button>
                    <button
                      onClick={() => handleMarkPaid(req, null)}
                      disabled={uploadingFor === req.id}
                      className="w-full mt-1 text-xs text-gray-400 underline"
                    >
                      Mark as paid without a screenshot
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {done.length > 0 && (
          <section>
            <h2 className="font-semibold mb-2">History</h2>
            <div className="space-y-2">
              {done.map((req) => (
                <div
                  key={req.id}
                  className="bg-white rounded-lg border border-gray-200 p-3 flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {req.requester?.display_name ?? "Someone"} · ₹
                      {req.amount}
                    </p>
                    <p
                      className={`text-xs capitalize ${
                        req.status === "declined" ? "text-red-500" : "text-gray-400"
                      }`}
                    >
                      {req.status}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
