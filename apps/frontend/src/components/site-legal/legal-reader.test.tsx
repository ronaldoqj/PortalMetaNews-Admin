import { MantineProvider } from "@mantine/core";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("../../i18n/navigation", () => ({ Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a> }));

import { LegalReader } from "./legal-reader";

const labels = {
  onThisPage: "Nesta página", copy: "Copiar", copied: "Copiado", notPublished: "Não publicado", heading: "Link", opensInNewTab: "Nova aba",
  alerts: { note: "Nota", tip: "Dica", important: "Importante", warning: "Atenção", caution: "Cuidado" },
};
const render = (content: string, siteHref?: (path: string) => string | undefined) => renderToStaticMarkup(
  <MantineProvider><LegalReader content={content} labels={labels} siteHref={siteHref} updated="Última atualização em 4 de novembro de 2026" /></MantineProvider>);

describe("the site's legal texts", () => {
  const content = "## 1. Quem somos\n\nTexto.\n\n## 2. Direitos\n\n> [!IMPORTANT]\n> Revisar.\n\nVeja a [Política de Privacidade](/privacidade) e o [arquivo](/docs/x.md).\n\n<script>alert(1)</script><b>cru</b>";

  it("outlines its sections beside the text and shows the last update", () => {
    const html = render(content);
    expect(html).toContain('id="1-quem-somos"');
    expect(html).toContain('href="#2-direitos"');
    expect(html).toContain("Nesta página");
    expect(html).toContain("Última atualização em 4 de novembro de 2026");
    expect(html).toContain("Importante");
  });

  it("keeps links between the legal texts on the site and drops raw HTML", () => {
    const html = render(content, (path) => (path === "/privacidade" ? "/pt/privacidade" : undefined));
    expect(html).toContain('href="/pt/privacidade"');
    expect(html).not.toContain('href="/docs/x.md"');
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<b>cru</b>");
  });
});
