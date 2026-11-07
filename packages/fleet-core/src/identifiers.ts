/** Identifiers: UUID, chassis number (VIN) and wheel formula (B-005). */

import { normAxle } from "./normalize.ts";

/** UUID v4. */
export function uuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  const b: number[] = [];
  for (let i = 0; i < 16; i++) b.push(Math.floor(Math.random() * 256));
  b[6] = ((b[6] as number) & 0x0f) | 0x40;
  b[8] = ((b[8] as number) & 0x3f) | 0x80;
  const h = b.map((x) => (x < 16 ? "0" : "") + x.toString(16)).join("");
  return h.slice(0, 8) + "-" + h.slice(8, 12) + "-" + h.slice(12, 16) + "-" + h.slice(16, 20) + "-" + h.slice(20);
}

/** 17 characters, A–Z and 0–9 without I, O and Q. */
const VIN_RE = /^[A-HJ-NPR-Z0-9]{17}$/;

export function validVin(v: string | null | undefined): boolean {
  return VIN_RE.test(v || "");
}

export interface Axle {
  positions: number;
  driven: number;
  axles: number;
}

/** Wheel positions x driven wheels, e.g. 4x2, 6x2, 6x4. No prefixes. Axles = positions / 2. */
export function parseAxle(s: unknown): Axle | null {
  const m = /^(\d{1,2})x(\d{1,2})$/.exec(normAxle(s) || "");
  if (!m) return null;
  const p = Number(m[1]);
  const d = Number(m[2]);
  if (p < 4 || p > 20 || p % 2 || d < 2 || d % 2 || d > p) return null;
  return { positions: p, driven: d, axles: p / 2 };
}
