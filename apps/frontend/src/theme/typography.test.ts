import { readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { brandingSchema, defaultBranding, defaultPanelBranding } from "../tokens/branding";
import { FONT_FAMILIES, FONT_OPTIONS, resolveFontFamily } from "../tokens/typography";
import { brandingStylesheet, createBrandingTheme } from "./theme";

const fontsDirectory = join(__dirname, "..", "app", "fonts");

describe("theme tokens", () => {
  it("starts the site in Newsreader headings over Inter and the panel in Manrope, falling back to Manrope", () => {
    expect(defaultBranding.typography).toEqual({ fontHeadings: "newsreader", fontBody: "inter" });
    expect(defaultPanelBranding.typography).toEqual({ fontHeadings: "manrope", fontBody: "manrope" });
    for (const invalid of [undefined, null, "", "comic-sans", "manrope; color:red", 3, {}]) {
      expect(resolveFontFamily(invalid)).toBe("var(--font-manrope), sans-serif");
    }
  });

  it("sets text, headings and corners from the theme", () => {
    const theme = createBrandingTheme({ ...defaultBranding, typography: { fontHeadings: "poppins", fontBody: "public-sans" }, radius: "none" });
    expect(theme.fontFamily).toBe("var(--font-public-sans), sans-serif");
    expect(theme.headings.fontFamily).toBe("var(--font-poppins), sans-serif");
    expect(theme.defaultRadius).toBe(0);
    expect(brandingStylesheet({ ...defaultBranding, radius: "lg" })).toContain("--app-radius:16px");
  });

  it("validates both bundled themes and bundles a file for every font but the system one", () => {
    expect(brandingSchema.safeParse(defaultBranding).success).toBe(true);
    expect(brandingSchema.safeParse(defaultPanelBranding).success).toBe(true);
    const files = readdirSync(fontsDirectory);
    for (const font of FONT_OPTIONS.filter((option) => option !== "system-ui")) {
      expect(files.some((file) => file.startsWith(font))).toBe(true);
      expect(FONT_FAMILIES[font]).toContain(`--font-${font}`);
    }
  });
});
