import { describe, expect, it } from "vitest";
import { getMessagesForLocale, type MessageTree } from "../../i18n/messages";
import { routing } from "../../i18n/routing";
import { PERMISSIONS } from "../admin/permissions";
import { PANEL_NAVIGATION, TRAILS, visibleEntry, type NavEntry } from "./area-navigation";

const entries = (list: ReadonlyArray<NavEntry>): NavEntry[] => list.flatMap((entry) => [entry, ...entries(entry.children ?? [])]);
const all = PANEL_NAVIGATION.flatMap((section) => entries(section.entries));
const has = (tree: MessageTree, path: string) => typeof path.split(".").reduce<unknown>((node, key) => (node as MessageTree)?.[key], tree) === "string";

describe("panel navigation", () => {
  it("names every entry, section and breadcrumb in both languages", () => {
    const labels = [...PANEL_NAVIGATION.map((section) => section.label), ...all.map((entry) => entry.label),
      ...Object.values(TRAILS).flatMap((trail) => trail!.map((step) => step.label))];
    for (const locale of routing.locales) expect(labels.filter((label) => !has(getMessagesForLocale(locale), label))).toEqual([]);
  });

  it("links only to panel routes and hides what an account may not open", () => {
    for (const entry of all) if (entry.href) expect(entry.href.startsWith("/panel/")).toBe(true);
    const reporter = ["news:read", "news:write", "media:manage", "ai:use"] as const;
    const visible = PANEL_NAVIGATION.flatMap((section) => section.entries.filter((entry) => visibleEntry(entry, reporter)).map((entry) => entry.label));
    expect(visible).toEqual(["Navigation.dashboard", "Navigation.news", "Navigation.aiWriter", "Navigation.media"]);
    expect(PANEL_NAVIGATION.flatMap((section) => section.entries).every((entry) => visibleEntry(entry, PERMISSIONS))).toBe(true);
  });
});
