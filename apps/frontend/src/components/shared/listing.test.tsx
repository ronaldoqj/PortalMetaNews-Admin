import { describe, expect, it } from "vitest";
import { CopyableValue } from "./copyable-value";
import { ListingFooter, usePage, ViewModeToggle } from "./listing";
import { renderMarkup } from "@/test-support/render";

function render(node: React.ReactNode, locale: "pt" | "en" = "pt") {
  return renderMarkup(node, { locale });
}

function Paged({ items, size }: { items: number[]; size: number }) {
  const page = usePage(items, size);
  return <span data-page={page.page} data-pages={page.pages}>{page.items.join(",")}</span>;
}

describe("listing helpers", () => {
  it("slices the first page and counts the pages", () => {
    expect(render(<Paged items={Array.from({ length: 23 }, (_, index) => index)} size={10} />))
      .toContain('data-page="1" data-pages="3">0,1,2,3,4,5,6,7,8,9<');
    expect(render(<Paged items={[]} size={10} />)).toContain('data-pages="1"');
  });

  it("shows the count right-aligned and the page selector only with more than one page", () => {
    const single = render(<ListingFooter total={3} label="3 denúncias" page={1} pages={1} onChange={() => {}} />);
    expect(single).toContain("3 denúncias");
    expect(single).toContain("--group-justify:flex-end");
    expect(single).not.toContain("mantine-Pagination");
    expect(render(<ListingFooter total={30} label="30" page={2} pages={3} onChange={() => {}} />)).toContain("mantine-Pagination");
  });

  it("labels the list and grid options in every catalog", () => {
    expect(render(<ViewModeToggle value="list" onChange={() => {}} />)).toContain('aria-label="Grade"');
    expect(render(<ViewModeToggle value="grid" onChange={() => {}} />, "en")).toContain('aria-label="List"');
  });

  it("offers a copy button beside a credential, named after it", () => {
    const html = render(<CopyableValue value={"A".repeat(36)} labels={{ copy: "Copiar", copied: "Copiado", name: "Protocolo" }} />);
    expect(html).toContain("A".repeat(36));
    expect(html).toContain('aria-label="Copiar: Protocolo"');
  });
});
