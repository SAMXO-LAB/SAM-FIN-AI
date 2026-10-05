import "server-only";

const DATA_URL = /^data:image\/(jpeg|webp|png);base64,([A-Za-z0-9+/]+={0,2})$/;
export const MAX_PHOTO_CHARS = 100_000;

/** Validates an uploaded photo (a data URL) by its type, size and real file signature. Returns null if anything is off. */
export const MAX_RECEIPT_CHARS = 640_000;

export function parsePhoto(dataUrl: string, maxChars = MAX_PHOTO_CHARS): { mime: string; bytes: Buffer; base64: string } | null {
  if (typeof dataUrl !== "string" || dataUrl.length > maxChars) return null;
  const m = DATA_URL.exec(dataUrl);
  if (!m) return null;
  const bytes = Buffer.from(m[2], "base64");
  if (bytes.length < 16) return null;
  const ok =
    m[1] === "jpeg" ? bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
    : m[1] === "png" ? bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    : bytes.subarray(0, 4).toString("latin1") === "RIFF" && bytes.subarray(8, 12).toString("latin1") === "WEBP";
  return ok ? { mime: `image/${m[1]}`, bytes, base64: m[2] } : null;
}
