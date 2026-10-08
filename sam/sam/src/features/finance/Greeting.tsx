"use client";
import { useEffect, useState } from "react";
import { greetingFor } from "@/lib/dates";

const fmt = (d: Date) => d.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });

/** Greeting and date line. The server supplies a first guess; the browser then uses the device clock so it is right in any time zone. */
export function GreetingHead({ first, serverGreeting, serverDate }: { first: string; serverGreeting: string; serverDate: string }) {
  const [g, setG] = useState({ greeting: serverGreeting, date: serverDate });
  useEffect(() => {
    const tick = () => { const n = new Date(); setG({ greeting: greetingFor(n.getHours()), date: fmt(n) }); };
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);
  return (
    <div>
      <div className="eyebrow" suppressHydrationWarning>{g.date}</div>
      <h1 className="page-title">{g.greeting}, {first}</h1>
    </div>
  );
}
