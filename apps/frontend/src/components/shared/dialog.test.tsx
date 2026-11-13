import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const received: Array<Record<string, unknown>> = [];
vi.mock("@mantine/core", async (original) => ({
  ...await original<typeof import("@mantine/core")>(),
  Modal: (props: Record<string, unknown> & { children?: ReactNode }) => { received.push(props); return <>{props.children}</>; },
}));
const { Modal } = await import("./dialog");

describe("shared modal", () => {
  beforeEach(() => { received.length = 0; });

  it("closes only through its close button or action by default, never by Escape or a backdrop click", () => {
    renderToStaticMarkup(<Modal opened onClose={() => undefined} title="Title">Body</Modal>);
    renderToStaticMarkup(<Modal opened onClose={() => undefined} title="Title" footer={<button>Save</button>}>Body</Modal>);
    for (const props of received) expect(props).toMatchObject({ closeOnClickOutside: false, closeOnEscape: false });
  });

  it("lets a modal opt into closing on a backdrop click", () => {
    renderToStaticMarkup(<Modal opened onClose={() => undefined} title="Title" closeOnClickOutside>Body</Modal>);
    expect(received[0]).toMatchObject({ closeOnClickOutside: true, closeOnEscape: false });
  });
});
