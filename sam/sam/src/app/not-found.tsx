import Link from "next/link";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="onb">
      <div className="sheet g4" style={{ width: "min(480px,100%)" }}>
        <div className="empty">
          <span className="eic"><Compass size={26} /></span>
          <h1 className="h2">We couldn’t find that page</h1>
          <p>The link may be old, or the page may have moved.</p>
          <div className="head-actions" style={{ justifyContent: "center", marginTop: 8 }}><Link className="btn btn-primary" href="/">Go to Finance Book AI</Link><Link className="btn btn-glass" href="/dashboard">Open dashboard</Link></div>
        </div>
      </div>
    </div>
  );
}
