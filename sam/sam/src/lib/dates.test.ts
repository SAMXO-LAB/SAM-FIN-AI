import { afterEach, describe, expect, it, vi } from "vitest";
import { greetingFor, iso, nowParts, today } from "./dates";

afterEach(() => vi.useRealTimers());

describe("server-side time uses the app time zone (India), not UTC", () => {
  it("3:01 pm in India is afternoon even though UTC says 09:31", () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-07T09:31:00Z"));
    expect(nowParts().h).toBe(15);
    expect(greetingFor(nowParts().h)).toBe("Good afternoon");
    expect(iso(today())).toBe("2026-10-07");
  });
  it("00:30 on 7 October in India is still 7 October (UTC says the 6th)", () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-06T19:00:00Z"));
    expect(iso(today())).toBe("2026-10-07");
    expect(greetingFor(nowParts().h)).toBe("Good night");
  });
});

describe("greetingFor", () => {
  it.each([[4, "Good night"], [5, "Good morning"], [11, "Good morning"], [12, "Good afternoon"], [16, "Good afternoon"], [17, "Good evening"], [23, "Good evening"]])("%i → %s", (h, g) => expect(greetingFor(h)).toBe(g));
});
