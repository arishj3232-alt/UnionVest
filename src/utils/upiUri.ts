export function buildUpiPayUri(params: {
  vpa: string; // pa
  payeeName?: string; // pn
  amount: number; // am
  note: string; // tn
}) {
  const { vpa, payeeName, amount, note } = params;
  const qp = new URLSearchParams();
  qp.set("pa", vpa);
  if (payeeName) qp.set("pn", payeeName);
  qp.set("am", amount.toFixed(2));
  qp.set("cu", "INR");
  qp.set("tn", note);
  return `upi://pay?${qp.toString()}`;
}

export function makeUpiNote(input: string) {
  // Keep note short and compatible across apps.
  return input
    .toUpperCase()
    .replace(/[^A-Z0-9-_]/g, "")
    .slice(0, 28);
}

