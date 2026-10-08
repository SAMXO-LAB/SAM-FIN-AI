"use client";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

function strength(p: string) {
  let s = 0;
  if (p.length >= 8) s++;
  if (p.length >= 12) s++;
  if (/[a-z]/.test(p) && /[A-Z]/.test(p)) s++;
  if (/\d/.test(p) && /[^A-Za-z0-9]/.test(p)) s++;
  return p ? Math.max(1, s) : 0;
}

export function PasswordInput({ id, name, autoComplete, meter, invalid }: { id: string; name: string; autoComplete: string; meter?: boolean; invalid?: boolean }) {
  const [show, setShow] = useState(false);
  const [v, setV] = useState("");
  return (
    <>
      <div className="pw-wrap">
        <input className="input" id={id} name={name} type={show ? "text" : "password"} autoComplete={autoComplete} required
          value={v} onChange={(e) => setV(e.target.value)} aria-invalid={invalid || undefined} maxLength={72} />
        <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? "Hide password" : "Show password"}>
          {show ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </div>
      {meter && (
        <>
          <div className="pw-meter" data-s={strength(v)} aria-hidden="true"><i /><i /><i /><i /></div>
          <span className="hint">At least 8 characters, with a letter and a number.</span>
        </>
      )}
    </>
  );
}
