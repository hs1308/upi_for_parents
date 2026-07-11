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
