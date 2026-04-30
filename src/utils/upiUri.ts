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

export type UpiApp = "gpay" | "phonepe" | "paytm";

const APP_SCHEMES: Record<UpiApp, string> = {
  gpay: "gpay://upi/pay",
  phonepe: "phonepe://pay",
  paytm: "paytmmp://pay",
};

const APP_LABELS: Record<UpiApp, string> = {
  gpay: "Google Pay",
  phonepe: "PhonePe",
  paytm: "Paytm",
};

export function buildUpiAppPayUri(
  app: UpiApp,
  params: { vpa: string; payeeName?: string; amount: number; note: string }
) {
  const baseUri = buildUpiPayUri(params);
  const query = baseUri.replace("upi://pay?", "");
  return `${APP_SCHEMES[app]}?${query}`;
}

export function getDirectPayAppOptions(
  params: { vpa: string; payeeName?: string; amount: number; note: string }
) {
  const generic = buildUpiPayUri(params);
  return (Object.keys(APP_SCHEMES) as UpiApp[]).map((app) => ({
    id: app,
    label: APP_LABELS[app],
    uri: buildUpiAppPayUri(app, params),
    fallbackUri: generic,
  }));
}

export function makeUpiNote(input: string) {
  // Keep note short and compatible across apps.
  return input
    .toUpperCase()
    .replace(/[^A-Z0-9-_]/g, "")
    .slice(0, 28);
}

