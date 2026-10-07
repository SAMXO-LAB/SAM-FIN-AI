"use client";
import { useEffect, useMemo, useState } from "react";
import { COUNTRIES, DEFAULT_COUNTRY, OTHER_COUNTRY, canonicalZone, countryByName, countryForZone, zoneLabel, type Country } from "@/lib/countries";

type Props = {
  defaultCountry: string | null;
  defaultTimezone: string | null;
  /** Pick the country and zone from the device clock when nothing has been saved yet. */
  detect?: boolean;
  /** Called when the country is picked, or detected, so the form can suggest a currency. */
  onCountry?: (c: Country | undefined, auto: boolean) => void;
  idPrefix: string;
  /** Rendered between the zone and the explanatory line (e.g. the currency field). */
  children?: React.ReactNode;
};

const deviceZone = () => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch { return ""; } };
const allZones = (): string[] => { try { return (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf?.("timeZone") ?? []; } catch { return []; } };

/** Country and time zone fields. Single-zone countries need nothing more; others get a zone list. */
export function CountryTimezone({ defaultCountry, defaultTimezone, detect, onCountry, idPrefix, children }: Props) {
  const known = countryByName(defaultCountry);
  const startCountry = defaultCountry && !known ? OTHER_COUNTRY : known?.name ?? DEFAULT_COUNTRY;
  const [country, setCountry] = useState(startCountry);
  const [zone, setZone] = useState(defaultTimezone ?? countryByName(startCountry)?.zones[0] ?? "Asia/Kolkata");
  const [device, setDevice] = useState("");

  useEffect(() => {
    const z = canonicalZone(deviceZone());
    setDevice(z);
    if (!detect || !z) return;
    const found = countryForZone(z);
    if (found) { setCountry(found.name); setZone(found.zones.includes(z) ? z : found.zones[0]); onCountry?.(found, true); }
    else { setCountry(OTHER_COUNTRY); setZone(z); onCountry?.(undefined, true); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detect]);

  const current = countryByName(country);
  const zones = useMemo(() => (country === OTHER_COUNTRY ? Array.from(new Set([device, zone, ...allZones()].filter(Boolean))) : current?.zones ?? [zone]), [country, current, device, zone]);
  const pickCountry = (name: string) => {
    setCountry(name);
    const c = countryByName(name);
    if (c) setZone(c.zones.includes(device) ? device : c.zones[0]);
    else if (device) setZone(device);
    onCountry?.(c, false);
  };
  const showZone = country === OTHER_COUNTRY || zones.length > 1;

  return (
    <>
      <div className="field">
        <label htmlFor={`${idPrefix}-country`}>Country</label>
        <select className="select" id={`${idPrefix}-country`} name="country" value={country} onChange={(e) => pickCountry(e.target.value)}>
          {defaultCountry && !known && defaultCountry !== OTHER_COUNTRY && <option value={OTHER_COUNTRY}>{defaultCountry} (other)</option>}
          {COUNTRIES.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
          {!(defaultCountry && !known) && <option value={OTHER_COUNTRY}>Other country</option>}
        </select>
      </div>
      {showZone ? (
        <div className="field">
          <label htmlFor={`${idPrefix}-tz`}>Time zone</label>
          <select className="select" id={`${idPrefix}-tz`} name="timezone" value={zone} onChange={(e) => setZone(e.target.value)}>
            {zones.map((z) => <option key={z} value={z}>{country === OTHER_COUNTRY ? z.replace(/_/g, " ") : zoneLabel(z)}</option>)}
          </select>
        </div>
      ) : <input type="hidden" name="timezone" value={zone} />}
      {children}
      <p className="hint full" style={{ margin: 0 }}>Your time zone is <b>{zone.replace(/_/g, " ")}</b>. Due dates, “today” and your greeting follow it{device && canonicalZone(device) !== zone ? ` (this device is set to ${device.replace(/_/g, " ")})` : ""}.</p>
    </>
  );
}
