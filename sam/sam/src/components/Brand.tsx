export function LogoMark({ size = 30 }: { size?: number }) {
  return (
    <svg className="brand-mark" width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="9.5" style={{ fill: "var(--ink)" }} />
      <path d="M7.5 6.6c3-2 7-2.6 10.5-1.6" fill="none" style={{ stroke: "var(--on-ink)" }} strokeOpacity=".22" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M21 11.2c-1.1-1.7-3-2.7-5.1-2.7-2.9 0-5.1 1.6-5.1 4 0 5.4 10.6 3.3 10.6 8.7 0 2.5-2.4 4.2-5.4 4.2-2.4 0-4.4-1-5.5-2.8" fill="none" style={{ stroke: "var(--on-ink)" }} strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

export function Brand() {
  return (
    <span className="brand">
      <LogoMark />
      <span className="brand-word">sam</span>
    </span>
  );
}
