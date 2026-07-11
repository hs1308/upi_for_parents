"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import jsQR from "jsqr";
import { createClient } from "@/lib/supabase/client";
import { parseUpiString } from "@/lib/upi";

export default function NewRequestPage({
  params,
}: {
  params: { friendId: string };
}) {
  const router = useRouter();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [upiId, setUpiId] = useState("");
  const [payeeName, setPayeeName] = useState("");
  const [amount, setAmount] = useState("");
  const [scanNote, setScanNote] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setScanNote(null);

    // Try to decode a UPI QR code directly from the photo so the person
    // doesn't have to type the UPI ID by hand.
    try {
      const bitmap = await createImageBitmap(file);
      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(bitmap, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height);

      if (code) {
        const parsed = parseUpiString(code.data);
        if (parsed.upiId) {
          setUpiId(parsed.upiId);
          setPayeeName(parsed.payeeName ?? "");
          if (parsed.amount) setAmount(parsed.amount);
          setScanNote("QR code scanned — details filled in below.");
        } else {
          setScanNote(
            "Couldn't read a UPI code from that photo. Enter the UPI ID manually below."
          );
        }
      } else {
        setScanNote(
          "Couldn't find a QR code in that photo. Enter the UPI ID manually below."
        );
      }
    } catch {
      setScanNote("Enter the UPI ID manually below.");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!photoFile) {
      setError("Please take a photo of the QR code or UPI ID first.");
      return;
    }
    if (!upiId.trim()) {
      setError("Please enter the UPI ID.");
      return;
    }
    if (!amount || Number(amount) <= 0) {
      setError("Please enter a valid amount.");
      return;
    }

    setSubmitting(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not logged in.");

      const path = `${user.id}/${Date.now()}-${photoFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from("upi-qr-images")
        .upload(path, photoFile);
      if (uploadError) throw uploadError;

      const { data: publicUrl } = supabase.storage
        .from("upi-qr-images")
        .getPublicUrl(path);

      const { error: insertError } = await supabase
        .from("upi_payment_requests")
        .insert({
          requester_id: user.id,
          payer_id: params.friendId,
          qr_image_url: publicUrl.publicUrl,
          upi_id: upiId.trim(),
          payee_name: payeeName.trim() || null,
          amount: Number(amount),
          status: "pending",
        });
      if (insertError) throw insertError;

      router.push("/requests/sent");
    } catch (err: any) {
      setError(err.message ?? "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="px-4 py-6">
      <h1 className="text-xl font-bold mb-6">Request a payment</h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium mb-2">
            1. Take a photo of the QR code or UPI ID
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            className="hidden"
          />
          {previewUrl ? (
            <div className="space-y-2">
              <img
                src={previewUrl}
                alt="QR code"
                className="w-full rounded-lg border border-gray-200"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-sm text-brand-700 underline"
              >
                Retake photo
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full bg-brand-600 text-white rounded-lg py-4 font-semibold text-lg"
            >
              📷 Open camera
            </button>
          )}
          {scanNote && (
            <p className="text-sm text-gray-500 mt-2">{scanNote}</p>
          )}
        </div>

        {previewUrl && (
          <>
            <div>
              <label className="block text-sm font-medium mb-1">
                UPI ID
              </label>
              <input
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-3"
                placeholder="e.g. shopkeeper@upi"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Payee name (optional)
              </label>
              <input
                value={payeeName}
                onChange={(e) => setPayeeName(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-3"
                placeholder="e.g. Sharma General Store"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                2. Amount to pay (₹)
              </label>
              <input
                type="number"
                inputMode="decimal"
                min="1"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-lg"
                placeholder="0.00"
              />
            </div>

            {error && <p className="text-red-600 text-sm">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-brand-600 text-white rounded-lg py-4 font-semibold text-lg disabled:opacity-50"
            >
              {submitting ? "Sending…" : "Send request"}
            </button>
          </>
        )}
      </form>
    </div>
  );
}
