/** Sam Fin AI mark: rising bars that form an "i". Colours are fixed brand values (#1D4ED8 / white). */
export function LogoMark({ size = 30 }: { size?: number }) {
  return (
    <svg className="brand-mark" width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      <rect width="100" height="100" rx="23" fill="#1D4ED8" />
      <rect className="lm-b" style={{ ["--k" as string]: 0 }} x="22" y="56" width="13" height="22" rx="6.5" fill="#fff" fillOpacity=".54" />
      <rect className="lm-b" style={{ ["--k" as string]: 1 }} x="43.5" y="42" width="13" height="36" rx="6.5" fill="#fff" fillOpacity=".8" />
      <rect className="lm-b" style={{ ["--k" as string]: 2 }} x="65" y="34" width="13" height="44" rx="6.5" fill="#fff" />
      <circle className="lm-dot" cx="71.5" cy="20.9" r="6.5" fill="#fff" />
    </svg>
  );
}

export function Brand({ tagline = false }: { tagline?: boolean }) {
  return (
    <span className="brand">
      <LogoMark />
      <span className="brand-text">
        <span className="brand-word">Sam Fin AI</span>
        {tagline && <span className="brand-tag">Money, managed.</span>}
      </span>
    </span>
  );
}

/** Looping version of the mark, for waiting states. */
export function LogoLoader({ size = 56 }: { size?: number }) {
  return <span className="logo-loader" role="status" aria-label="Loading"><LogoMark size={size} /></span>;
}
