/** Date helpers working on local calendar dates stored as YYYY-MM-DD. */
export const DAY = 86_400_000;

/** Time zone used when dates are worked out on the server (browsers use the device's own zone). Set APP_TIMEZONE to change it. */
export const APP_TIMEZONE = process.env.APP_TIMEZONE?.trim() || "Asia/Kolkata";

/** Wall-clock parts of "now" in the app time zone (server) or the device zone (browser). */
export function nowParts(tz?: string | null): { y: number; m: number; d: number; h: number } {
  const n = new Date();
  if (typeof window !== "undefined") return { y: n.getFullYear(), m: n.getMonth() + 1, d: n.getDate(), h: n.getHours() };
  try {
    const p = Object.fromEntries(new Intl.DateTimeFormat("en-GB", { timeZone: tz || APP_TIMEZONE, hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric", hour: "numeric" }).formatToParts(n).map((x) => [x.type, Number(x.value)]));
    return { y: p.year, m: p.month, d: p.day, h: p.hour };
  } catch {
    return tz && tz !== APP_TIMEZONE ? nowParts(APP_TIMEZONE) : { y: n.getFullYear(), m: n.getMonth() + 1, d: n.getDate(), h: n.getHours() };
  }
}

export function today(tz?: string | null): Date {
  const { y, m, d } = nowParts(tz);
  return new Date(y, m - 1, d);
}

export const greetingFor = (h: number) => (h < 5 ? "Good night" : h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening");
export const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export function parseISO(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}
export const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
export function addMonths(d: Date, n: number): Date {
  const x = new Date(d.getFullYear(), d.getMonth() + n, 1);
  const last = new Date(x.getFullYear(), x.getMonth() + 1, 0).getDate();
  x.setDate(Math.min(d.getDate(), last));
  return x;
}
export const daysBetween = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / DAY);
export function monthsBetween(a: Date, b: Date): number {
  return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
}
export const fmtDate = (s: string, o?: Intl.DateTimeFormatOptions) =>
  parseISO(s).toLocaleDateString("en-IN", o ?? { day: "numeric", month: "short", year: "numeric" });
export const fmtShort = (s: string) => parseISO(s).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
export function relDay(d: Date, ref = today()): string {
  const n = daysBetween(ref, d);
  if (n === 0) return "Today";
  if (n === 1) return "Tomorrow";
  if (n === -1) return "Yesterday";
  return n > 0 ? `In ${n} days` : `${Math.abs(n)} days ago`;
}
