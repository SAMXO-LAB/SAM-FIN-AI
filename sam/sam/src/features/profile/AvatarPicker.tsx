"use client";
import { useRef, useState } from "react";
import { Camera, Trash2 } from "lucide-react";
import { Avatar, type AvatarInfo } from "@/components/avatar/Avatar";
import { PresetAvatar, defaultKey, presetsFor, type Gender } from "@/components/avatar/presets";

const GENDERS: [Gender, string][] = [["male", "Male"], ["female", "Female"], ["unspecified", "Prefer not to say"]];
const MAX_FILE = 10 * 1024 * 1024;

/** Crops to a centred square, resizes in the browser and re-encodes as JPEG (this also strips camera metadata). */
async function toSquareJpeg(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => no(new Error("load")); i.src = url; });
    const s = Math.min(img.naturalWidth, img.naturalHeight);
    if (!s) throw new Error("empty");
    const sx = (img.naturalWidth - s) / 2, sy = (img.naturalHeight - s) / 2;
    for (const [size, q] of [[256, 0.86], [256, 0.72], [192, 0.7], [160, 0.6]] as const) {
      const c = document.createElement("canvas"); c.width = c.height = size;
      const g = c.getContext("2d")!; g.fillStyle = "#fff"; g.fillRect(0, 0, size, size); g.drawImage(img, sx, sy, s, s, 0, 0, size, size);
      const d = c.toDataURL("image/jpeg", q);
      if (d.length <= 90_000) return d;
    }
    throw new Error("big");
  } finally { URL.revokeObjectURL(url); }
}

export function AvatarPicker({ me }: { me: AvatarInfo }) {
  const [gender, setGender] = useState<Gender>(me.gender);
  const [kind, setKind] = useState(me.avatar_kind);
  const [key, setKey] = useState(me.avatar_key ?? "");
  const [photo, setPhoto] = useState<string | null>(null); // a newly chosen photo, not saved yet
  const [err, setErr] = useState("");
  const file = useRef<HTMLInputElement>(null);

  const options = presetsFor(gender);
  const previewId = kind === "preset" && key ? key : defaultKey(gender, me.id);

  async function onFile(f?: File) {
    if (!f) return;
    setErr("");
    if (!/^image\/(jpeg|png|webp)$/.test(f.type)) return setErr("Please choose a JPG, PNG or WebP image.");
    if (f.size > MAX_FILE) return setErr("That image is too large. Choose one under 10 MB.");
    try { setPhoto(await toSquareJpeg(f)); setKind("photo"); } catch { setErr("We couldn’t read that image. Try a different one."); }
    if (file.current) file.current.value = "";
  }

  return (
    <div className="avp full">
      <input type="hidden" name="gender" value={gender} />
      <input type="hidden" name="avatar_kind" value={kind} />
      <input type="hidden" name="avatar_key" value={kind === "preset" ? key : ""} />
      <input type="hidden" name="avatar_photo" value={kind === "photo" && photo ? photo : ""} />

      <div className="avp-top">
        <div className="avp-big" aria-live="polite">
          {kind === "photo" && photo
            // eslint-disable-next-line @next/next/no-img-element
            ? <img className="avatar-img" src={photo} alt="Your new profile picture" width={96} height={96} />
            : kind === "photo" ? <Avatar user={me} size={96} label />
            : <PresetAvatar id={previewId} size={96} title="Your profile picture" />}
        </div>
        <div className="avp-actions">
          <b>Profile picture</b>
          <span className="hint" style={{ margin: 0 }}>Upload your own photo, or pick a picture below. Photos are resized on your device and stored privately in your account.</span>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
            <input ref={file} id="avp-file" type="file" accept="image/jpeg,image/png,image/webp" className="sr" onChange={(e) => onFile(e.target.files?.[0])} />
            <label htmlFor="avp-file" className="btn btn-glass btn-sm" style={{ cursor: "pointer" }}><Camera size={15} />Upload photo</label>
            {(kind === "photo" || kind === "preset") && <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setKind("default"); setPhoto(null); setKey(""); setErr(""); }}><Trash2 size={15} />{kind === "photo" ? "Remove photo" : "Use automatic picture"}</button>}
          </div>
          {err && <span className="notice err" role="alert" style={{ marginTop: 6 }}>{err}</span>}
        </div>
      </div>

      <div className="field">
        <span className="lbl" id="avp-gender">Gender</span>
        <div className="seg" role="radiogroup" aria-labelledby="avp-gender">
          {GENDERS.map(([g, label]) => (
            <button key={g} type="button" role="radio" aria-checked={gender === g} className={gender === g ? "on" : ""} onClick={() => setGender(g)}>{label}</button>
          ))}
        </div>
        <span className="hint">Optional. Used only to choose a default picture. Never shown to anyone else.</span>
      </div>

      <div className="field">
        <span className="lbl" id="avp-pick">Choose a picture</span>
        <div className="avp-grid" role="radiogroup" aria-labelledby="avp-pick">
          {options.map((id) => (
            <button key={id} type="button" role="radio" aria-checked={kind === "preset" && key === id} aria-label={`Picture ${id}`} className={`avp-opt${kind === "preset" && key === id ? " on" : ""}`}
              onClick={() => { setKind("preset"); setKey(id); setPhoto(null); setErr(""); }}>
              <PresetAvatar id={id} size={52} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
