/** All money is held as integer minor units (paise). Never use floats for stored amounts. */
export type Paise = number;

const nf0 = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
const nf2 = new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Parse user input like "1,23,456.5" or "₹ 500" into paise. Returns null when invalid. */
export function toPaise(input: unknown): Paise | null {
  if (input === null || input === undefined) return null;
  const s = String(input).replace(/[,\s₹]/g, "");
  if (!/^\d{1,13}(\.\d{1,2})?$/.test(s)) return null;
  const [whole, frac = ""] = s.split(".");
  return Number(whole) * 100 + Number((frac + "00").slice(0, 2));
}

/** Same as toPaise but allows a leading minus (for balances such as a credit card). */
export function toSignedPaise(input: unknown): Paise | null {
  const s = String(input ?? "").trim();
  const neg = /^[-−]/.test(s);
  const v = toPaise(s.replace(/^[-−]/, ""));
  return v === null ? null : neg ? -v : v;
}

export function formatINR(p: Paise, opts: { sign?: boolean; decimals?: boolean } = {}): string {
  const neg = p < 0;
  const v = Math.abs(p) / 100;
  const s = opts.decimals ? nf2.format(v) : nf0.format(Math.round(v));
  return (neg ? "−" : opts.sign && p > 0 ? "+" : "") + "₹" + s;
}

/** Indian short form: ₹1.2K, ₹3.45 L, ₹1.2 Cr */
export function compactINR(p: Paise): string {
  const v = Math.abs(p) / 100;
  const t = (x: number, d: number) => x.toFixed(d).replace(/\.?0+$/, "");
  let s: string;
  if (v >= 1e7) s = t(v / 1e7, 2) + " Cr";
  else if (v >= 1e5) s = t(v / 1e5, 2) + " L";
  else if (v >= 1e3) s = t(v / 1e3, 1) + "K";
  else s = nf0.format(Math.round(v));
  return (p < 0 ? "−" : "") + "₹" + s;
}

export function paiseToInput(p: Paise | null | undefined): string {
  if (p === null || p === undefined) return "";
  const whole = Math.trunc(p / 100);
  const frac = Math.abs(p % 100);
  return frac ? `${whole}.${String(frac).padStart(2, "0")}` : String(whole);
}

export const pct = (x: number, d = 0) => (x * 100).toFixed(d) + "%";
