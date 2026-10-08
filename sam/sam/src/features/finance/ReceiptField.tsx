"use client";
import { useRef, useState } from "react";
import { Camera, X } from "lucide-react";

export const MAX_RECEIPTS = 3;
const MAX_FILE = 15 * 1024 * 1024;
const LIMIT_CHARS = 600_000;

/** Shrinks a photo to at most ~1400px and re-encodes as JPEG (this also strips camera location data). */
async function shrink(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => no(new Error("load")); i.src = url; });
    const w0 = img.naturalWidth, h0 = img.naturalHeight;
    if (!w0 || !h0) throw new Error("empty");
    for (const [max, q] of [[1400, 0.8], [1400, 0.65], [1200, 0.6], [1000, 0.55], [800, 0.5]] as const) {
      const k = Math.min(1, max / Math.max(w0, h0));
      const c = document.createElement("canvas"); c.width = Math.round(w0 * k); c.height = Math.round(h0 * k);
      const g = c.getContext("2d")!; g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
      const d = c.toDataURL("image/jpeg", q);
      if (d.length <= LIMIT_CHARS) return d;
    }
    throw new Error("big");
  } finally { URL.revokeObjectURL(url); }
}

/** Optional receipt or photo for a transaction. Existing images (when editing) can be removed; new ones are added. */
export function ReceiptField({ existing = [] }: { existing?: string[] }) {
  const [removed, setRemoved] = useState<string[]>([]);
  const [added, setAdded] = useState<string[]>([]);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const kept = existing.filter((id) => !removed.includes(id));
  const total = kept.length + added.length;

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setErr(""); setBusy(true);
    const next: string[] = [];
    let room = MAX_RECEIPTS - total;
    for (const f of Array.from(files)) {
      if (room <= 0) { setErr(`You can attach up to ${MAX_RECEIPTS} images.`); break; }
      if (!/^image\/(jpeg|png|webp)$/.test(f.type)) { setErr("Please choose JPG, PNG or WebP images."); continue; }
      if (f.size > MAX_FILE) { setErr("One image was too large (over 15 MB)."); continue; }
      try { next.push(await shrink(f)); room--; } catch { setErr("We couldn’t read one of those images."); }
    }
    if (next.length) setAdded((a) => [...a, ...next]);
    setBusy(false);
    if (input.current) input.current.value = "";
  }

  return (
    <div className="field full rcp">
      {removed.map((id) => <input key={id} type="hidden" name="receipt_remove" value={id} />)}
      {added.map((d, i) => <input key={i} type="hidden" name="receipt_new" value={d} />)}
      <span className="lbl" id="rcp-label">Receipt or photo <span className="muted" style={{ fontWeight: 400 }}>(optional)</span></span>
      <div className="rcp-row" aria-labelledby="rcp-label">
        {kept.map((id, i) => (
          <div className="rcp-thumb" key={id}>
            <a href={`/api/receipts/${id}`} target="_blank" rel="noreferrer" aria-label={`Open saved receipt ${i + 1}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/receipts/${id}`} alt={`Saved receipt ${i + 1}`} loading="lazy" />
            </a>
            <button type="button" className="rcp-x" aria-label={`Remove saved receipt ${i + 1}`} onClick={() => setRemoved((r) => [...r, id])}><X size={14} /></button>
          </div>
        ))}
        {added.map((d, i) => (
          <div className="rcp-thumb" key={i}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={d} alt={`New receipt ${i + 1}`} />
            <button type="button" className="rcp-x" aria-label={`Remove new receipt ${i + 1}`} onClick={() => setAdded((a) => a.filter((_, j) => j !== i))}><X size={14} /></button>
          </div>
        ))}
        {total < MAX_RECEIPTS && (
          <>
            <input ref={input} id="rcp-file" type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr" onChange={(e) => onFiles(e.target.files)} />
            <label htmlFor="rcp-file" className={`rcp-add${busy ? " busy" : ""}`}><Camera size={18} /><span>{busy ? "Preparing…" : total ? "Add another" : "Add receipt"}</span></label>
          </>
        )}
      </div>
      {err && <span className="field-err" role="alert">{err}</span>}
      <span className="hint">Up to {MAX_RECEIPTS} images. Cover card numbers and OTPs before you upload. Stored privately in your account.</span>
    </div>
  );
}
