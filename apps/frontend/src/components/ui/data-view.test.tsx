import { describe, expect, it, vi } from "vitest";
import { renderMarkup } from "@/test-support/render";
import { DataView, useListingView, type Column } from "./data-view";

vi.mock("../../i18n/navigation", () => ({ Link: ({ children }: { children: unknown }) => children }));

type Row = { id: string; name: string; status: string; city: string; notes: string };
const ROWS: Row[] = [{ id: "a", name: "Ana Lima", status: "Ativo", city: "Campinas", notes: "Só na lista" }, { id: "b", name: "Bruno", status: "Inativo", city: "Belém", notes: "x" }];
const COLUMNS: ReadonlyArray<Column<Row>> = [
  { key: "photo", header: "Foto", card: "cover", width: 80, render: (row) => <span data-cover="">{`/media/${row.id}/sm`}</span> },
  { key: "name", header: "Nome", render: (row) => row.name },
  { key: "status", header: "Situação", card: "aside", render: (row) => row.status },
  { key: "city", header: "Cidade", render: (row) => row.city },
  { key: "notes", header: "Notas", card: "hidden", render: (row) => row.notes },
];
const render = (view?: "list" | "grid") => renderMarkup(<DataView rows={ROWS} columns={COLUMNS} rowKey={(row) => row.id} view={view} />);

describe("DataView", () => {
  it.each([undefined, "list"] as const)("draws rows with every column, the cover as a thumbnail, when the view is %s", (view) => {
    const markup = render(view);
    expect(markup).toContain("<table");
    expect(markup).toContain('data-view="list"');
    for (const text of ["Foto", "Nome", "Situação", "Cidade", "Notas", "Ana Lima", "Só na lista", "/media/a/sm"]) expect(markup).toContain(text);
  });

  it("draws cards from the same columns: the cover on top, the title, the asides, labelled details, never a hidden column", () => {
    const markup = render("grid");
    expect(markup).not.toContain("<table");
    expect(markup).toContain('data-view="grid"');
    expect(markup).toMatch(/<li[^>]*data-cover=""[^>]*>.*\/media\/a\/sm.*Ana Lima.*Ativo.*<dt>Cidade<\/dt><dd>Campinas<\/dd>/);
    expect(markup).not.toContain("<dt>Situação</dt>");
    expect(markup).not.toContain("<dt>Foto</dt>");
    expect(markup).not.toContain("Só na lista");
  });

  it("brings the items in one after the other, the first ones sooner", () => {
    const markup = render("grid");
    expect(markup).toContain("--data-view-delay:0ms");
    expect(markup).toContain("--data-view-delay:25ms");
  });

  it.each(["list", "grid"] as const)("shows only what stands for nothing in the %s view of no rows", (view) => {
    expect(renderMarkup(<DataView rows={[]} columns={COLUMNS} rowKey={(row) => row.id} view={view} empty="Nada aqui" />)).toMatch(/Nada aqui$/);
  });

  it("offers both views by default, cards first, with a labelled switch", () => {
    function Listing() {
      const listing = useListingView("test");
      return <>{listing.toggle}<DataView rows={ROWS} columns={COLUMNS} rowKey={(row) => row.id} view={listing.view} /></>;
    }
    const markup = renderMarkup(<Listing />);
    expect(markup).toContain('data-view="grid"');
    expect(markup).toContain('aria-label="Modo de exibição"');
  });
});
