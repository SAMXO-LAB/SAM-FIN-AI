import { afterEach, describe, expect, it, vi } from "vitest";
import { COUNTRIES, canonicalZone, countryForZone, isValidZone } from "./countries";
import { iso, nowParts, today } from "./dates";

afterEach(() => vi.useRealTimers());

describe("countries", () => {
  it("every listed zone is a real time zone", () => { for (const c of COUNTRIES) for (const z of c.zones) expect(isValidZone(z), `${c.name} ${z}`).toBe(true); });
  it("country names are unique", () => expect(new Set(COUNTRIES.map((c) => c.name)).size).toBe(COUNTRIES.length));
  it("finds the country from a device zone, including old names", () => {
    expect(countryForZone("Asia/Kolkata")?.name).toBe("India");
    expect(countryForZone("Asia/Calcutta")?.name).toBe("India");
    expect(canonicalZone("Asia/Calcutta")).toBe("Asia/Kolkata");
    expect(countryForZone("America/Detroit")?.name).toBe("United States");
    expect(countryForZone("Europe/London")?.currency).toBe("GBP");
    expect(countryForZone("Antarctica/Troll")).toBeUndefined();
  });
  it("rejects invalid zones", () => { expect(isValidZone("Mars/Base")).toBe(false); expect(isValidZone("")).toBe(false); expect(isValidZone("x".repeat(80))).toBe(false); });
});

describe("dates follow the chosen time zone", () => {
  it("the same instant is a different day in Sydney and New York", () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-07T20:00:00Z"));
    expect(iso(today("Australia/Sydney"))).toBe("2026-10-08");
    expect(iso(today("America/New_York"))).toBe("2026-10-07");
    expect(nowParts("America/New_York").h).toBe(16);
  });
  it("falls back to the default zone for an unknown zone", () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-07T09:31:00Z"));
    expect(nowParts("Not/AZone").h).toBe(15);
  });
});
