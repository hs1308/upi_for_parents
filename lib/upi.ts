// Helpers for working with UPI QR payloads and building "pay" deep links.

export type ParsedUpi = {
  upiId: string | null;
  payeeName: string | null;
  amount: string | null;
};

// A standard UPI QR encodes a URI like:
// upi://pay?pa=someone@bank&pn=Some%20Name&am=100&cu=INR
export function parseUpiString(raw: string): ParsedUpi {
  try {
    const withScheme = raw.includes("://") ? raw : `upi://pay?${raw}`;
    const url = new URL(withScheme);
    const params = url.searchParams;
    return {
      upiId: params.get("pa"),
      payeeName: params.get("pn"),
      amount: params.get("am"),
    };
  } catch {
    // Not a recognizable UPI URI. If it just looks like a bare UPI ID
    // (e.g. "someone@bank"), use it directly; otherwise give up gracefully.
    const bareIdPattern = /^[\w.\-]{2,}@[\w.\-]{2,}$/;
    if (bareIdPattern.test(raw.trim())) {
      return { upiId: raw.trim(), payeeName: null, amount: null };
    }
    return { upiId: null, payeeName: null, amount: null };
  }
}

// Builds the deep link that opens the phone's UPI app chooser with the
// payment already filled in.
export function buildUpiPayLink(params: {
  upiId: string;
  payeeName?: string | null;
  amount: number;
  note?: string;
}) {
  const search = new URLSearchParams({
    pa: params.upiId,
    pn: params.payeeName || "Merchant",
    am: params.amount.toFixed(2),
    cu: "INR",
  });
  if (params.note) search.set("tn", params.note);
  return `upi://pay?${search.toString()}`;
}

// --- OCR fallback (used when the photo isn't a scannable QR code, e.g. a
// photo of a printed/handwritten UPI ID or a phone number) ---

// Matches things like "someone@okhdfcbank" or "9876543210@ybl".
const UPI_ID_PATTERN = /[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z][a-zA-Z0-9.\-_]{1,64}/;

// Matches Indian mobile numbers, optionally with a +91 / 91 prefix and
// spaces/dashes in between (common in printed shop signage).
const PHONE_PATTERN = /(?:\+?91[\s-]?)?[6-9]\d{2}[\s-]?\d{3}[\s-]?\d{4}\b/;

export type OcrExtraction =
  | { kind: "upi_id"; value: string }
  | { kind: "phone"; value: string }
  | { kind: "none" };

export function extractPaymentIdentifierFromText(text: string): OcrExtraction {
  const upiMatch = text.match(UPI_ID_PATTERN);
  if (upiMatch) {
    return { kind: "upi_id", value: upiMatch[0] };
  }

  const phoneMatch = text.match(PHONE_PATTERN);
  if (phoneMatch) {
    return { kind: "phone", value: phoneMatch[0].replace(/[\s-]/g, "") };
  }

  return { kind: "none" };
}

