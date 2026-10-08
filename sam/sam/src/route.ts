import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const PACKAGE = /^[A-Za-z][A-Za-z0-9_]*(\.[A-Za-z][A-Za-z0-9_]*)+$/;
const SHA256 = /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/;

/**
 * Digital Asset Links, the file that lets Android open this site as a full-screen app (Trusted Web Activity)
 * without the browser address bar. Set ANDROID_PACKAGE_NAME and ANDROID_SHA256_FINGERPRINTS (comma separated).
 * Until both are set, an empty list is returned, which is valid and harmless.
 */
export function GET() {
  const pkg = (process.env.ANDROID_PACKAGE_NAME ?? "").trim();
  const prints = (process.env.ANDROID_SHA256_FINGERPRINTS ?? "")
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter((s) => SHA256.test(s));
  const body = PACKAGE.test(pkg) && prints.length
    ? [{ relation: ["delegate_permission/common.handle_all_urls"], target: { namespace: "android_app", package_name: pkg, sha256_cert_fingerprints: prints } }]
    : [];
  return NextResponse.json(body, { headers: { "Cache-Control": "public, max-age=300" } });
}
