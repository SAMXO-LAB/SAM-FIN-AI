/** Built-in avatars: original flat illustrations, drawn in code. Ids: m1–m6 (male), f1–f6 (female), n1–n3 (neutral). */
import type { ReactNode } from "react";

export type Gender = "male" | "female" | "unspecified";
export const MALE = ["m1", "m2", "m3", "m4", "m5", "m6"] as const;
export const FEMALE = ["f1", "f2", "f3", "f4", "f5", "f6"] as const;
export const NEUTRAL = ["n1", "n2", "n3"] as const;
export const isPresetKey = (k: unknown): k is string => typeof k === "string" && /^[mfn][1-6]$/.test(k) && (k[0] !== "n" || +k[1] <= 3);

export const presetsFor = (g: Gender): readonly string[] => (g === "male" ? [...MALE, ...NEUTRAL] : g === "female" ? [...FEMALE, ...NEUTRAL] : [...NEUTRAL, ...MALE, ...FEMALE]);

/** Picks a stable default for a user so people get different faces, from their gender and id. */
export function defaultKey(gender: Gender, seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const pool = gender === "male" ? MALE : gender === "female" ? FEMALE : NEUTRAL;
  return pool[h % pool.length];
}

const SKIN = ["#F2CBA7", "#E5B089", "#CE9468", "#B27648", "#8F5B38", "#6E4329"];
const HAIR = { black: "#1A1A22", dark: "#2E2019", brown: "#4A3022", auburn: "#7A3B25", grey: "#8B8D97" };

type Look = { bg: [string, string]; skin: string; shirt: string; hair: string; hairStyle: string; beard?: boolean; glasses?: boolean; earrings?: boolean; lip?: string };
const LOOKS: Record<string, Look> = {
  m1: { bg: ["#BFD4FF", "#7EA1F7"], skin: SKIN[2], shirt: "#1D4ED8", hair: HAIR.black, hairStyle: "crop" },
  m2: { bg: ["#FDE1B8", "#F6B26B"], skin: SKIN[1], shirt: "#0F766E", hair: HAIR.dark, hairStyle: "quiff" },
  m3: { bg: ["#CDEFE3", "#7FD1B5"], skin: SKIN[4], shirt: "#B45309", hair: HAIR.black, hairStyle: "curly" },
  m4: { bg: ["#E3D5FF", "#B497F5"], skin: SKIN[3], shirt: "#334155", hair: HAIR.black, hairStyle: "crop", beard: true },
  m5: { bg: ["#FFD3D6", "#F59AA1"], skin: SKIN[0], shirt: "#6D28D9", hair: HAIR.brown, hairStyle: "wavy", glasses: true },
  m6: { bg: ["#D7E8F8", "#8DB8E8"], skin: SKIN[5], shirt: "#166534", hair: HAIR.black, hairStyle: "bald", beard: true, glasses: true },
  f1: { bg: ["#FFD6E8", "#F58FC0"], skin: SKIN[1], shirt: "#BE185D", hair: HAIR.black, hairStyle: "long", lip: "#C2415D" },
  f2: { bg: ["#D9F0E4", "#86D3AE"], skin: SKIN[2], shirt: "#1D4ED8", hair: HAIR.dark, hairStyle: "bob", lip: "#B83B54", earrings: true },
  f3: { bg: ["#FFE4C7", "#F7B779"], skin: SKIN[0], shirt: "#9333EA", hair: HAIR.auburn, hairStyle: "bun", lip: "#C2415D" },
  f4: { bg: ["#CFE0FF", "#8AA9F5"], skin: SKIN[3], shirt: "#0E7490", hair: HAIR.black, hairStyle: "pony", lip: "#A83250", earrings: true },
  f5: { bg: ["#EAD8FF", "#BC98F2"], skin: SKIN[4], shirt: "#DC2626", hair: HAIR.black, hairStyle: "puff", lip: "#9F2D45" },
  f6: { bg: ["#FFF0B8", "#F5CD5C"], skin: SKIN[2], shirt: "#0F766E", hair: HAIR.brown, hairStyle: "sidelong", lip: "#B83B54", earrings: true },
};

function hairBack(l: Look): ReactNode {
  const c = l.hair;
  switch (l.hairStyle) {
    case "long": return <path d="M33 56C29 26 46 17 60 17s31 9 27 39l3 50H30z" fill={c} />;
    case "bob": return <path d="M34 58C30 26 46 18 60 18s30 8 26 40l1 20c-6 6-14 6-18 2H51c-4 4-12 4-18-2z" fill={c} />;
    case "pony": return <path d="M80 36c16 2 20 24 10 44-3 6-8 8-10 5 6-12 6-24-4-33z" fill={c} />;
    case "puff": return <g fill={c}><circle cx="36" cy="40" r="13" /><circle cx="84" cy="40" r="13" /><circle cx="44" cy="26" r="14" /><circle cx="76" cy="26" r="14" /><circle cx="60" cy="22" r="15" /></g>;
    case "sidelong": return <path d="M33 56C29 26 46 17 60 17s31 9 27 39l2 40c-8 6-16 4-20-2H51c-4 6-12 8-20 2z" fill={c} />;
    default: return null;
  }
}
function hairFront(l: Look): ReactNode {
  const c = l.hair;
  switch (l.hairStyle) {
    case "crop": return <path d="M38 50C34 30 46 22 60 22s26 8 22 28c-3-9-9-14-22-14s-19 5-22 14z" fill={c} />;
    case "quiff": return <path d="M37 51C32 27 50 17 66 22c13 4 19 14 15 29-2-8-7-13-15-14-12-1-22 3-29 14z" fill={c} />;
    case "curly": return <g fill={c}><circle cx="42" cy="38" r="10" /><circle cx="52" cy="29" r="11" /><circle cx="65" cy="28" r="11" /><circle cx="76" cy="36" r="10" /><circle cx="82" cy="47" r="7" /><circle cx="38" cy="48" r="7" /></g>;
    case "wavy": return <path d="M36 62C30 32 46 20 60 20s30 12 24 42c-1-12-4-20-10-24-8 3-24 3-32-2-4 6-6 14-6 26z" fill={c} />;
    case "long": return <><path d="M38 52C36 32 46 22 60 22s24 10 22 30c-4-8-12-14-24-14-8 0-16 4-20 14z" fill={c} /><path d="M33 56c-2 16 0 34 4 48h8c-6-14-8-30-7-46zM87 56c2 16 0 34-4 48h-8c6-14 8-30 7-46z" fill={c} /></>;
    case "bob": return <path d="M38 52C35 32 46 22 60 22s25 10 22 30c-5-9-12-14-22-14s-17 5-22 14z" fill={c} />;
    case "bun": return <><circle cx="60" cy="16" r="10" fill={c} /><path d="M38 52C34 32 46 22 60 22s26 10 22 30c-4-8-10-14-22-14s-18 6-22 14z" fill={c} /></>;
    case "pony": return <path d="M38 52C34 30 46 21 60 21s26 9 22 31c-4-9-9-16-22-16s-18 7-22 16z" fill={c} />;
    case "puff": return <path d="M40 50C38 36 48 28 60 28s22 8 20 22c-4-7-10-11-20-11s-16 4-20 11z" fill={c} />;
    case "sidelong": return <path d="M37 54C32 30 46 19 60 19s27 11 22 35c-1-9-5-17-14-21-12 12-22 18-31 21z" fill={c} />;
    case "bald": return null;
    default: return null;
  }
}

export function PresetAvatar({ id, size = 40, title }: { id: string; size?: number; title?: string }) {
  const l = LOOKS[id];
  const uid = `pa-${id}`;
  if (!l) return NeutralAvatar({ id, size, title });
  const dark = "#2B2230";
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" role={title ? "img" : undefined} aria-label={title} aria-hidden={title ? undefined : true} style={{ display: "block", borderRadius: "50%" }}>
      <defs><linearGradient id={`${uid}-bg`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={l.bg[0]} /><stop offset="1" stopColor={l.bg[1]} /></linearGradient></defs>
      <rect width="120" height="120" fill={`url(#${uid}-bg)`} />
      {hairBack(l)}
      <path d="M14 122c0-26 20-36 46-36s46 10 46 36z" fill={l.shirt} />
      <path d="M48 86c3 8 9 11 12 11s9-3 12-11" fill={l.skin} />
      <rect x="51" y="70" width="18" height="20" rx="8" fill={l.skin} />
      <circle cx="39.5" cy="55" r="4.2" fill={l.skin} /><circle cx="80.5" cy="55" r="4.2" fill={l.skin} />
      {l.earrings && <><circle cx="39" cy="62" r="2" fill="#F5C542" /><circle cx="81" cy="62" r="2" fill="#F5C542" /></>}
      <ellipse cx="60" cy="52" rx="21" ry="24" fill={l.skin} />
      {l.beard && <path d="M39 56c0 18 9 28 21 28s21-10 21-28c-4 10-10 13-21 13S43 66 39 56z" fill={l.hair} />}
      {hairFront(l)}
      <g fill={dark}><ellipse cx="51" cy="54" rx="2.4" ry="2.9" /><ellipse cx="69" cy="54" rx="2.4" ry="2.9" /></g>
      <g stroke={l.hair === HAIR.grey ? "#555" : l.hair} strokeWidth="2.2" strokeLinecap="round" fill="none" opacity=".9"><path d="M46 47.5q5-2.6 10 0" /><path d="M64 47.5q5-2.6 10 0" /></g>
      <path d="M57 58.5q3 2 6 0" stroke="rgba(0,0,0,.18)" strokeWidth="1.6" strokeLinecap="round" fill="none" />
      <path d="M51.5 65.5q8.5 7 17 0" stroke={l.lip ?? dark} strokeWidth="2.6" strokeLinecap="round" fill="none" />
      {l.glasses && <g fill="none" stroke="#1F2937" strokeWidth="2"><circle cx="51" cy="54" r="7.6" /><circle cx="69" cy="54" r="7.6" /><path d="M58.6 54h2.8" /></g>}
    </svg>
  );
}

/** Abstract, non-human options (also used for people who prefer not to say). */
function NeutralAvatar({ id, size, title }: { id: string; size: number; title?: string }) {
  const p = id === "n2" ? ["#FFE1A8", "#F59E0B", "#B45309"] : id === "n3" ? ["#D6F5E6", "#34D399", "#047857"] : ["#C7D7FE", "#4F7BEA", "#1D4ED8"];
  const uid = `pa-${id}`;
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" role={title ? "img" : undefined} aria-label={title} aria-hidden={title ? undefined : true} style={{ display: "block", borderRadius: "50%" }}>
      <defs><linearGradient id={`${uid}-bg`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={p[0]} /><stop offset="1" stopColor={p[1]} /></linearGradient></defs>
      <rect width="120" height="120" fill={`url(#${uid}-bg)`} />
      {id === "n2" ? <><circle cx="60" cy="60" r="30" fill="none" stroke="#fff" strokeOpacity=".7" strokeWidth="9" /><circle cx="60" cy="60" r="12" fill={p[2]} /></>
        : id === "n3" ? <><path d="M20 84c14-24 26-24 40 0s26 24 40 0" fill="none" stroke="#fff" strokeOpacity=".85" strokeWidth="10" strokeLinecap="round" /><circle cx="60" cy="40" r="11" fill={p[2]} /></>
        : <><rect x="30" y="64" width="14" height="26" rx="7" fill="#fff" fillOpacity=".6" /><rect x="53" y="48" width="14" height="42" rx="7" fill="#fff" fillOpacity=".85" /><rect x="76" y="34" width="14" height="56" rx="7" fill="#fff" /></>}
    </svg>
  );
}
