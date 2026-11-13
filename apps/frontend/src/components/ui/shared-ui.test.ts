import { relative } from "node:path";
import { describe, expect, it } from "vitest";
import { SOURCE_ROOT, sources } from "@/test-support/sources";

/** Controls every area reuses through `components/ui` (and the modal through `components/shared/dialog`). */
const SHARED = ["Modal", "Select", "MultiSelect", "TextInput", "PasswordInput", "Textarea", "NumberInput", "Switch", "Checkbox",
  "ColorInput", "SegmentedControl", "Radio", "Button", "ActionIcon", "CopyButton", "Card", "Paper", "Title", "InputBase", "RichTextEditor"];
const owners = ["components/ui/", "components/shared/dialog.tsx"];

describe("shared UI entry points", () => {
  it("keeps modals and form and UI controls out of direct @mantine/core and @mantine/tiptap imports outside their shared modules", () => {
    const offenders = [...sources].flatMap(([path, text]) => {
      const file = relative(SOURCE_ROOT, path);
      if (owners.some((owner) => file.startsWith(owner))) return [];
      return [...text.matchAll(/import\s*\{([^}]*)\}\s*from\s*"@mantine\/(?:core|tiptap)"/g)]
        .flatMap(([, names]) => names.split(",").map((name) => name.trim().replace(/^type\s+/, "").split(/\s+as\s+/)[0]))
        .filter((name) => SHARED.includes(name)).map((name) => `${file}: ${name}`);
    });
    expect(offenders).toEqual([]);
  });
});
