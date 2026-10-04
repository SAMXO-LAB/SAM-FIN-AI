"use client";
import { CircleAlert } from "lucide-react";

export default function AppError({ reset }: { error: Error; reset: () => void }) {
  return (
    <section className="card g2">
      <div className="empty">
        <span className="eic"><CircleAlert size={26} /></span>
        <h2 className="h2">We couldn’t load this page</h2>
        <p>Your data is safe. This is usually a brief connection problem. Try again in a moment.</p>
        <button className="btn btn-primary" onClick={reset}>Try again</button>
      </div>
    </section>
  );
}
