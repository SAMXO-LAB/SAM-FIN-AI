export function PageHead({ eyebrow, title, sub, actions }: { eyebrow: string; title: React.ReactNode; sub?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="page-head">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1 className="page-title">{title}</h1>
        {sub && <p className="muted page-sub">{sub}</p>}
      </div>
      {actions && <div className="head-actions">{actions}</div>}
    </div>
  );
}

export function Empty({ icon, title, body, children }: { icon: React.ReactNode; title: string; body: string; children?: React.ReactNode }) {
  return (
    <div className="empty">
      <span className="eic">{icon}</span>
      <h3 className="h2">{title}</h3>
      <p>{body}</p>
      {children && <div className="head-actions" style={{ justifyContent: "center", marginTop: 8 }}>{children}</div>}
    </div>
  );
}

export function Stat({ k, v, d, tone }: { k: string; v: React.ReactNode; d?: React.ReactNode; tone?: "pos" | "neg" | "warn" }) {
  return (
    <div className="stat-card g2">
      <div className="k">{k}</div>
      <div className={`v${tone ? ` ${tone}-t` : ""}`}>{v}</div>
      {d && <div className="d">{d}</div>}
    </div>
  );
}
