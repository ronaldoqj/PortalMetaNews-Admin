import type { CSSProperties } from "react";

/** A section's colour (a Mantine palette name from the API) as the `--section-color` its labels and rules draw with. */
export function sectionColor(color: string | null | undefined): CSSProperties | undefined {
  return color && /^[a-z]+$/.test(color) ? ({ "--section-color": `var(--mantine-color-${color}-6)` } as CSSProperties) : undefined;
}
