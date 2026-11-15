import { Group, MantineProvider } from "@mantine/core";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { theme } from "../../theme/theme";
import { Page, Section, StatusBadge } from "./layout";

const render = (node: React.ReactNode) => renderToStaticMarkup(<MantineProvider theme={theme}>{node}</MantineProvider>);
/** Whether a block element opens inside an open paragraph: invalid HTML that breaks hydration. */
const blockInParagraph = (html: string) => /<p\b[^>]*>(?:(?!<\/p>)[\s\S])*<div\b/.test(html);

describe("layout", () => {
  it("renders a badge as an inline label, valid inside a line of text", () => {
    const html = render(<p>Status: <StatusBadge tone="success">Publicada</StatusBadge></p>);
    expect(html).toMatch(/<span[^>]*mantine-Badge-root/);
    expect(blockInParagraph(html)).toBe(false);
  });

  it("keeps a plain description a paragraph and a rich one a block", () => {
    expect(render(<Page title="T" description="Texto" />)).toMatch(/<p[^>]*>Texto<\/p>/);
    const rich = render(<>
      <Page title="T" description={<Group component="span"><StatusBadge>Rascunho</StatusBadge>Salvo</Group>} />
      <Section title="S" description={<Group><StatusBadge>Ativo</StatusBadge></Group>} />
    </>);
    expect(blockInParagraph(rich)).toBe(false);
  });
});
