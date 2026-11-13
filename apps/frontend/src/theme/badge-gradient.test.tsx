import { Badge, createTheme, MantineProvider } from "@mantine/core";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { defaultBranding } from "../tokens/branding";
import { createBrandingTheme } from "./theme";

const render = (badge: React.ReactNode) => renderToStaticMarkup(
  <MantineProvider theme={createTheme(createBrandingTheme(defaultBranding))}>{badge}</MantineProvider>);

describe("chips with a gradient", () => {
  it("runs solid chips from their colour to a darker shade of it, through the theme's variables", () => {
    const html = render(<Badge color="teal">Publicado</Badge>);
    expect(html).toContain("--badge-bg:linear-gradient(30deg, var(--mantine-color-teal-filled) 0%, color-mix(in srgb, var(--mantine-color-teal-filled), black 22%) 100%)");
  });

  it("deepens pale chips only a touch and follows the primary colour by default", () => {
    expect(render(<Badge variant="light" color="orange">Atenção</Badge>)).toContain("color-mix(in srgb, var(--mantine-color-orange-light), black 8%)");
    expect(render(<Badge>Novo</Badge>)).toContain("var(--mantine-color-brand-filled) 0%");
  });

  it("lays a discreet shadow in the chip's own darker colour under solid and pale chips", () => {
    expect(render(<Badge color="teal">Publicado</Badge>)).toContain("box-shadow:0 1px 2px color-mix(in srgb, color-mix(in srgb, var(--mantine-color-teal-filled), black 40%), transparent 65%)");
    expect(render(<Badge variant="light" color="teal">Publicado</Badge>)).toContain("transparent 80%)");
    expect(render(<Badge variant="outline" color="teal">Ativo</Badge>)).not.toContain("box-shadow");
  });

  it("keeps outlined and dotted chips flat", () => {
    expect(render(<Badge variant="outline" color="teal">Ativo</Badge>)).not.toContain("linear-gradient");
    expect(render(<Badge variant="dot" color="teal">Ativo</Badge>)).not.toContain("linear-gradient");
  });
});
