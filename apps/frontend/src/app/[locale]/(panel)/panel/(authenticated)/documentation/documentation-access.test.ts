import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ actor: vi.fn(), catalog: vi.fn(), document: vi.fn() }));
vi.mock("@/components/admin/api-call", () => ({ currentActor: mocks.actor }));
vi.mock("@/components/admin/forbidden-notice", () => ({ ForbiddenNotice: () => null }));
vi.mock("@/components/documentation/catalog", () => ({ readCatalog: mocks.catalog, readDocument: mocks.document, readingMinutes: () => 1 }));
vi.mock("next-intl/server", () => ({ getTranslations: async () => (key: string) => key }));
vi.mock("@/i18n/navigation", () => ({ Link: () => null }));

const { ForbiddenNotice } = await import("@/components/admin/forbidden-notice");
const { PageNotFound } = await import("@/components/shared/page-not-found");
const { DocumentationIndex } = await import("@/components/documentation/documentation-index");
const { default: DocumentationPage } = await import("./page");
const { default: DocumentPage } = await import("./[id]/page");

const open = { read: () => DocumentationPage(), document: () => DocumentPage({ params: Promise.resolve({ id: "readme" }) }) };
const actor = (permissions: string[]) => ({ userId: "u", permissions });
const CATALOG = [{ title: "G", description: "", documents: [{ slug: "other", title: "O", summary: "", source: "o.md", words: 1 }] }];

describe("access to the documentation", () => {
  beforeEach(() => vi.clearAllMocks());

  it.each([["an account without the permission", actor(["news:read"])], ["no session", null]])("refuses %s before reading any file", async (_name, account) => {
    mocks.actor.mockResolvedValue(account);
    for (const page of [open.read, open.document]) expect(((await page()) as { type: unknown }).type).toBe(ForbiddenNotice);
    expect(mocks.catalog).not.toHaveBeenCalled();
    expect(mocks.document).not.toHaveBeenCalled();
  });

  it("shows an empty state while nothing is published, and the index once a catalog exists", async () => {
    mocks.actor.mockResolvedValue(actor(["documentation:read"]));
    mocks.catalog.mockResolvedValue(null);
    expect(((await open.read()) as { type: unknown }).type).not.toBe(DocumentationIndex);
    mocks.catalog.mockResolvedValue(CATALOG);
    expect(((await open.read()) as { type: unknown }).type).toBe(DocumentationIndex);
  });

  it("opens only a document of the catalog", async () => {
    mocks.actor.mockResolvedValue(actor(["documentation:read"]));
    mocks.catalog.mockResolvedValue(CATALOG);
    expect(((await open.document()) as { type: unknown }).type).toBe(PageNotFound);
    expect(mocks.document).not.toHaveBeenCalled();
  });
});
