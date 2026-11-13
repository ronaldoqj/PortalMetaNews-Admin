import { describe, expect, it } from "vitest";
import { brandingSchema, defaultBranding } from "../../tokens/branding";
import { contrastRatio, previewVariables } from "./preview-variables";
import { parseThemeFile, themeFileContent, themeFileName } from "./theme-file";

describe("theme files", () => {
  it("exports and imports a theme without loss", () => {
    const content = themeFileContent({ name: "Noite de eleição", description: "Azul profundo", tokens: defaultBranding });
    const parsed = parseThemeFile(content, "qualquer.json");
    expect(parsed).toEqual({ ok: true, theme: { name: "Noite de eleição", description: "Azul profundo", tokens: defaultBranding } });
    expect(themeFileName("Noite de eleição!")).toBe("noite-de-eleicao.theme.json");
  });

  it("accepts bare tokens, named after the file", () => {
    expect(parseThemeFile(JSON.stringify(defaultBranding), "jornal_azul.theme.json")).toMatchObject({ ok: true, theme: { name: "jornal azul", description: "" } });
  });

  it.each([
    ["not JSON", "{", "invalid"],
    ["a colour that is not hex", JSON.stringify({ ...defaultBranding, light: { ...defaultBranding.light, primary: "red" } }), "invalid"],
    ["an unknown key", JSON.stringify({ ...defaultBranding, script: "x" }), "invalid"],
    ["a missing token", JSON.stringify({ ...defaultBranding, radius: undefined }), "invalid"],
    ["a huge file", JSON.stringify({ padding: "x".repeat(70_000) }), "tooLarge"],
  ])("refuses %s", (_case, text, error) => {
    expect(parseThemeFile(text, "x.json")).toEqual({ ok: false, error });
  });
});

describe("theme preview", () => {
  it("scopes the scheme's tokens, fonts and corners to the preview", () => {
    const tokens = brandingSchema.parse({ ...defaultBranding, radius: "lg", typography: { fontHeadings: "poppins", fontBody: "roboto" } });
    const dark = previewVariables(tokens, "dark") as Record<string, string>;
    expect(dark["--app-primary"]).toBe(tokens.dark.primary);
    expect(dark["--app-background"]).toBe(tokens.dark.background);
    expect(dark["--app-radius"]).toBe("16px");
    expect(dark["--mantine-font-family-headings"]).toBe("var(--font-poppins), sans-serif");
    expect(dark["--app-field-bg"]).toBe(tokens.dark.surface);
    expect(dark.colorScheme).toBe("dark");
  });

  it("measures contrast as WCAG does", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 0);
    expect(contrastRatio("#777777", "#777777")).toBe(1);
  });
});
