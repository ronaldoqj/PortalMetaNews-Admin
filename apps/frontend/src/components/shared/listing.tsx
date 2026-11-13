"use client";

import { Center, Group, Pagination, Text, Tooltip } from "@mantine/core";
import { LayoutGrid, List } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState, type ReactNode } from "react";
import { SegmentedControl } from "../ui/forms/input";
import styles from "./listing.module.css";

/** How a listing presents its items: a grid of cards (the default) or compact rows. */
export type ViewMode = "list" | "grid";

const VIEW_MODE_KEY = "pmn:view-mode:";

/**
 * The view mode of one listing, remembered per browser as a convenience only: it starts at `fallback`
 * on the server and in the first render, so the markup never depends on browser storage.
 */
export function useViewMode(listing: string, fallback: ViewMode = "grid"): [ViewMode, (mode: ViewMode) => void] {
  const [mode, setMode] = useState<ViewMode>(fallback);
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(VIEW_MODE_KEY + listing);
      // Reading browser storage can only happen after hydration; the stored choice then replaces the default.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (stored === "list" || stored === "grid") setMode(stored);
    } catch {
      // Storage may be blocked; the default stays.
    }
  }, [listing]);
  return [mode, (next) => {
    setMode(next);
    try { window.localStorage.setItem(VIEW_MODE_KEY + listing, next); } catch { /* not remembered */ }
  }];
}

/** The grid/list switch shown beside a listing's search, the default (grid) first. */
export function ViewModeToggle({ value, onChange }: { value: ViewMode; onChange: (mode: ViewMode) => void }) {
  const t = useTranslations("Listing");
  const option = (mode: ViewMode, icon: ReactNode) => ({
    value: mode,
    label: <Tooltip label={t(`view.${mode}`)} withArrow><Center aria-label={t(`view.${mode}`)}>{icon}</Center></Tooltip>,
  });
  return <SegmentedControl size="xs" aria-label={t("view.label")} value={value} onChange={(next) => onChange(next as ViewMode)}
    data={[option("grid", <LayoutGrid size={16} aria-hidden="true" />), option("list", <List size={16} aria-hidden="true" />)]} />;
}

/**
 * The items of a listing that draws its own cards or rows (not a `DataView`), without a box of its own. Switching
 * views draws them anew, and they (table rows, the cards of a `SimpleGrid`, the children of an element marked
 * `data-listing-items`) come in one after the other, as do the items of a new page; rows take an accent bar and cards
 * lift under the pointer.
 */
export function ListingView({ view, children }: { view: ViewMode; children: ReactNode }) {
  return <div key={view} className={styles.view} data-view={view}>{children}</div>;
}

/** One page of an already loaded list, and the setter of the page; it clamps when the list shrinks. */
export function usePage<Item>(items: readonly Item[], pageSize: number) {
  const [requested, setPage] = useState(1);
  const pages = Math.max(1, Math.ceil(items.length / pageSize));
  const page = Math.min(requested, pages);
  return { page, pages, setPage, items: items.slice((page - 1) * pageSize, page * pageSize), total: items.length };
}

/** The count of a listing, right-aligned, with the page selector beside it when there is more than one page. */
export function ListingFooter({ total, label, page, pages, onChange, disabled = false }: {
  total: number;
  /** The translated count, such as "12 reports". */
  label: string;
  page: number;
  pages: number;
  onChange: (page: number) => void;
  disabled?: boolean;
}) {
  return <Group justify="flex-end" gap="md" wrap="wrap" data-total={total}>
    <Text size="sm" c="dimmed" role="status">{label}</Text>
    {pages > 1 && <Pagination size="sm" total={pages} value={page} onChange={onChange} disabled={disabled} />}
  </Group>;
}
