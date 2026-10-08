/** Countries offered at sign-up, with their time zone(s) and, where we support it, a suggested currency. */
export interface Country { name: string; zones: string[]; currency?: "INR" | "USD" | "EUR" | "GBP" | "AED" | "SGD" }

const c = (name: string, zones: string | string[], currency?: Country["currency"]): Country => ({ name, zones: Array.isArray(zones) ? zones : [zones], currency });

export const COUNTRIES: Country[] = [
  c("Argentina", "America/Argentina/Buenos_Aires"), c("Australia", ["Australia/Sydney", "Australia/Melbourne", "Australia/Brisbane", "Australia/Adelaide", "Australia/Perth", "Australia/Darwin", "Australia/Hobart"]),
  c("Austria", "Europe/Vienna", "EUR"), c("Bahrain", "Asia/Bahrain"), c("Bangladesh", "Asia/Dhaka"), c("Belgium", "Europe/Brussels", "EUR"), c("Bhutan", "Asia/Thimphu"),
  c("Brazil", ["America/Sao_Paulo", "America/Manaus", "America/Fortaleza"]), c("Canada", ["America/Toronto", "America/Vancouver", "America/Edmonton", "America/Winnipeg", "America/Regina", "America/Halifax", "America/St_Johns"]),
  c("Chile", "America/Santiago"), c("China", "Asia/Shanghai"), c("Colombia", "America/Bogota"), c("Denmark", "Europe/Copenhagen"), c("Egypt", "Africa/Cairo"),
  c("Finland", "Europe/Helsinki", "EUR"), c("France", "Europe/Paris", "EUR"), c("Germany", "Europe/Berlin", "EUR"), c("Greece", "Europe/Athens", "EUR"), c("Hong Kong", "Asia/Hong_Kong"),
  c("India", "Asia/Kolkata", "INR"), c("Indonesia", ["Asia/Jakarta", "Asia/Makassar", "Asia/Jayapura"]), c("Ireland", "Europe/Dublin", "EUR"), c("Israel", "Asia/Jerusalem"),
  c("Italy", "Europe/Rome", "EUR"), c("Japan", "Asia/Tokyo"), c("Kenya", "Africa/Nairobi"), c("Kuwait", "Asia/Kuwait"), c("Malaysia", "Asia/Kuala_Lumpur"), c("Maldives", "Indian/Maldives"),
  c("Mexico", ["America/Mexico_City", "America/Cancun", "America/Tijuana"]), c("Nepal", "Asia/Kathmandu"), c("Netherlands", "Europe/Amsterdam", "EUR"), c("New Zealand", "Pacific/Auckland"),
  c("Nigeria", "Africa/Lagos"), c("Norway", "Europe/Oslo"), c("Oman", "Asia/Muscat"), c("Pakistan", "Asia/Karachi"), c("Peru", "America/Lima"), c("Philippines", "Asia/Manila"),
  c("Poland", "Europe/Warsaw"), c("Portugal", "Europe/Lisbon", "EUR"), c("Qatar", "Asia/Qatar"), c("Russia", ["Europe/Moscow", "Asia/Yekaterinburg", "Asia/Novosibirsk", "Asia/Vladivostok"]),
  c("Saudi Arabia", "Asia/Riyadh"), c("Singapore", "Asia/Singapore", "SGD"), c("South Africa", "Africa/Johannesburg"), c("South Korea", "Asia/Seoul"), c("Spain", "Europe/Madrid", "EUR"),
  c("Sri Lanka", "Asia/Colombo"), c("Sweden", "Europe/Stockholm"), c("Switzerland", "Europe/Zurich"), c("Thailand", "Asia/Bangkok"), c("Turkey", "Europe/Istanbul"),
  c("Ukraine", "Europe/Kyiv"), c("United Arab Emirates", "Asia/Dubai", "AED"), c("United Kingdom", "Europe/London", "GBP"),
  c("United States", ["America/New_York", "America/Chicago", "America/Denver", "America/Phoenix", "America/Los_Angeles", "America/Anchorage", "Pacific/Honolulu"], "USD"), c("Vietnam", "Asia/Ho_Chi_Minh"),
];

export const OTHER_COUNTRY = "Other";
export const DEFAULT_COUNTRY = "India";

/** Older browsers report some zones under their former names. */
const ALIASES: Record<string, string> = { "Asia/Calcutta": "Asia/Kolkata", "Asia/Saigon": "Asia/Ho_Chi_Minh", "Asia/Katmandu": "Asia/Kathmandu", "Europe/Kiev": "Europe/Kyiv", "Asia/Rangoon": "Asia/Yangon" };
export const canonicalZone = (z: string) => ALIASES[z] ?? z;

export const countryByName = (n?: string | null) => COUNTRIES.find((x) => x.name === n);

/** Best guess of the country from a device time zone. */
export function countryForZone(zone: string): Country | undefined {
  const z = canonicalZone(zone);
  return COUNTRIES.find((x) => x.zones.includes(z)) ?? (z.startsWith("America/") && /^America\/(Detroit|Indiana|Kentucky|Boise|Juneau|Los_Angeles|Menominee|Nome|North_Dakota)/.test(z) ? countryByName("United States") : undefined);
}

export function isValidZone(z: string): boolean {
  if (!z || z.length > 64) return false;
  try { new Intl.DateTimeFormat("en", { timeZone: z }); return true; } catch { return false; }
}

/** "Asia/Kolkata" → "Kolkata", "America/Argentina/Buenos_Aires" → "Buenos Aires". */
export const zoneLabel = (z: string) => z.split("/").pop()!.replace(/_/g, " ");
