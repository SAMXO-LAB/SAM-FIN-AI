import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { parsePhoto } from "./avatar";

const b64 = (b: number[]) => Buffer.from([...b, ...new Array(20).fill(7)]).toString("base64");

describe("parsePhoto", () => {
  it("accepts a real JPEG signature", () => {
    expect(parsePhoto(`data:image/jpeg;base64,${b64([0xff, 0xd8, 0xff, 0xe0])}`)?.mime).toBe("image/jpeg");
  });
  it("accepts PNG and WebP signatures", () => {
    expect(parsePhoto(`data:image/png;base64,${b64([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])}`)?.mime).toBe("image/png");
    const webp = Buffer.concat([Buffer.from("RIFF"), Buffer.from([1, 2, 3, 4]), Buffer.from("WEBP"), Buffer.alloc(20)]).toString("base64");
    expect(parsePhoto(`data:image/webp;base64,${webp}`)?.mime).toBe("image/webp");
  });
  it("rejects SVG, HTML and mismatched content", () => {
    expect(parsePhoto(`data:image/svg+xml;base64,${b64([60, 115, 118, 103])}`)).toBeNull();
    expect(parsePhoto(`data:text/html;base64,${b64([60, 104, 116, 109, 108])}`)).toBeNull();
    expect(parsePhoto(`data:image/jpeg;base64,${b64([60, 115, 99, 114, 105, 112, 116])}`)).toBeNull(); // claims JPEG, is not
  });
  it("rejects oversize and malformed input", () => {
    expect(parsePhoto("data:image/jpeg;base64," + "A".repeat(100_001))).toBeNull();
    expect(parsePhoto("not a data url")).toBeNull();
    expect(parsePhoto("data:image/jpeg;base64,@@@@")).toBeNull();
  });
});
