/**
 * Colour, legibility and logos (B-017, B-037). WCAG 2.x relative luminance and contrast, used for
 * the header, accent colour and logos.
 *
 * PLATFORM: belongs to the platform's design system. Moves to `@annecto-grid/ui` in M3.
 */

function hexRgb(h: string | null | undefined): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(h || "");
  if (!m) return null;
  const n = parseInt(m[1] as string, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function lumOfRgb(r: number, g: number, b: number): number {
  const c = [r, g, b].map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  }) as [number, number, number];
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

/** Relative luminance of a hex colour. Invalid colours count as white (1). */
export function luminance(hex: string | null | undefined): number {
  const c = hexRgb(hex);
  return c ? lumOfRgb(c[0], c[1], c[2]) : 1;
}

function contrastLum(a: number, b: number): number {
  const hi = Math.max(a, b);
  const lo = Math.min(a, b);
  return (hi + 0.05) / (lo + 0.05);
}

export function contrast(a: string | null | undefined, b: string | null | undefined): number {
  return contrastLum(luminance(a), luminance(b));
}

const INK_LIGHT = "#ffffff";
const INK_DARK = "#16191d";

/** White or dark text, whichever has the higher contrast against the background. */
export function bestInk(bg: string | null | undefined): string {
  return contrast(bg, INK_LIGHT) >= contrast(bg, INK_DARK) ? INK_LIGHT : INK_DARK;
}

export interface LogoVariant {
  src: string;
  /** Average luminance of the logo. */
  lum?: number;
  /** The logo has a transparent background. */
  alpha?: boolean;
}

/**
 * Picks a logo variant for a background. `logos.light` is meant for a light background.
 * Returns `{ src, plate }` where `plate` is a background colour for a plate when contrast is too low.
 */
export function pickLogo(
  logos: { light?: LogoVariant | null; dark?: LogoVariant | null } | null | undefined,
  bgHex: string | null | undefined,
): { src: string; plate: string | null } | null {
  const bgL = luminance(bgHex);
  const dark = bgL < 0.18;
  const l = logos || {};
  const order = dark ? [l.dark, l.light] : [l.light, l.dark];
  const cand = order.filter((x): x is LogoVariant => !!(x && x.src));
  if (!cand.length) return null;
  const best = cand
    .map((x) => ({ x, c: contrastLum(typeof x.lum === "number" ? x.lum : 0.5, bgL) }))
    .sort((a, b) => b.c - a.c)[0] as { x: LogoVariant; c: number };
  if (best.c >= 2.2) return { src: best.x.src, plate: null };
  const lum = typeof best.x.lum === "number" ? best.x.lum : 0.5;
  return { src: best.x.src, plate: lum < 0.4 ? INK_LIGHT : INK_DARK };
}

export interface AdaptedLogo {
  src: string;
  tone: null | "light" | "dark";
  plate: null | string;
}

/**
 * A logo is adapted to the background (B-037): the original when contrast is sufficient, otherwise a
 * single-colour version in light or dark (requires a transparent background) or, without
 * transparency, a plate.
 */
export function adaptLogo(logo: LogoVariant | null | undefined, bgHex: string | null | undefined): AdaptedLogo | null {
  if (!logo || !logo.src) return null;
  const bgL = luminance(bgHex);
  const lum = typeof logo.lum === "number" ? logo.lum : 0.5;
  if (contrastLum(lum, bgL) >= 2.2) return { src: logo.src, tone: null, plate: null };
  if (logo.alpha) return { src: logo.src, tone: bestInk(bgHex) === INK_LIGHT ? "light" : "dark", plate: null };
  return { src: logo.src, tone: null, plate: lum < 0.4 ? INK_LIGHT : INK_DARK };
}

/** The company's logo; older profiles with two variants use the variant for a light background. */
export function brandLogo(
  br: { logo?: LogoVariant | null; logoLight?: LogoVariant | null; logoDark?: LogoVariant | null } | null | undefined,
): LogoVariant | null {
  return br ? br.logo || br.logoLight || br.logoDark || null : null;
}
