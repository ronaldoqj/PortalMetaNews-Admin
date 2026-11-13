import { parse, TYPE, type MessageFormatElement } from "@formatjs/icu-messageformat-parser";
import { describe, expect, it } from "vitest";
import { getMessagesForLocale, MESSAGE_PARTS, type MessageTree } from "./messages";

const leaves = (tree: MessageTree, prefix = ""): string[] => Object.entries(tree).flatMap(([key, value]) =>
  typeof value === "string" ? [`${prefix}${key}`] : leaves(value as MessageTree, `${prefix}${key}.`));

/** The ICU arguments a message takes (plural and select branches included), so both languages ask their callers for the same values. */
const argumentsOf = (message: string): string[] => {
  const names = new Set<string>();
  const visit = (elements: MessageFormatElement[]) => {
    for (const element of elements) {
      if (element.type === TYPE.literal || element.type === TYPE.pound) continue;
      names.add(element.value);
      if (element.type === TYPE.plural || element.type === TYPE.select) Object.values(element.options).forEach((option) => visit(option.value));
      if (element.type === TYPE.tag) visit(element.children);
    }
  };
  visit(parse(message));
  return [...names].sort();
};

const value = (tree: MessageTree, path: string): string => {
  const found = path.split(".").reduce<MessageTree[string] | undefined>((node, key) => (typeof node === "object" ? (node as MessageTree)[key] : undefined), tree);
  return typeof found === "string" ? found : "";
};

describe("message catalogs", () => {
  const parts = Object.keys(MESSAGE_PARTS.pt) as Array<keyof typeof MESSAGE_PARTS.pt>;

  it("keeps the same parts in both base catalogs", () => {
    expect(Object.keys(MESSAGE_PARTS.en).sort()).toEqual([...parts].sort());
  });

  it.each(["pt", "en"] as const)("keeps every %s namespace in exactly one part", (locale) => {
    const owners = new Map<string, string[]>();
    for (const [part, tree] of Object.entries(MESSAGE_PARTS[locale])) {
      for (const namespace of Object.keys(tree)) owners.set(namespace, [...(owners.get(namespace) ?? []), part]);
    }
    expect([...owners].filter(([, files]) => files.length > 1)).toEqual([]);
  });

  it.each(parts)("keeps the %s part complete in both base catalogs", (part) => {
    expect(leaves(MESSAGE_PARTS.en[part]).sort()).toEqual(leaves(MESSAGE_PARTS.pt[part]).sort());
  });

  it.each(parts)("asks for the same values in both languages of the %s part", (part) => {
    const portuguese = MESSAGE_PARTS.pt[part] as MessageTree;
    const english = MESSAGE_PARTS.en[part] as MessageTree;
    const different = leaves(portuguese).filter((key) => value(english, key) &&
      argumentsOf(value(portuguese, key)).join() !== argumentsOf(value(english, key)).join());
    expect(different).toEqual([]);
  });

  it("names the product in every catalog", () => {
    for (const locale of ["pt", "en"] as const) {
      expect(value(getMessagesForLocale(locale), "Common.brand")).toBe("Portal Meta News");
    }
  });
});
