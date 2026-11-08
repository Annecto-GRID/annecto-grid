/**
 * @annecto-grid/ui – the platform's design system (B-017).
 *
 * M1 contains the design tokens (`tokens.css`) and base styles (`base.css`).
 * The app frame, table, form, menu bar and dialog components follow in M3.
 * Import the styles once in an app: `import "@annecto-grid/ui/tokens.css"` and `".../base.css"`.
 */

export type Theme = "light" | "dark";

/** Applies a theme by setting `data-theme` on the root element. */
export function applyTheme(root: { setAttribute(name: string, value: string): void }, theme: Theme): void {
  root.setAttribute("data-theme", theme);
}

/** The theme that follows the operating system's setting. */
export function systemTheme(prefersDark: boolean): Theme {
  return prefersDark ? "dark" : "light";
}
