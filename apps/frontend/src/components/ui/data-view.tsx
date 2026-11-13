"use client";

import { Menu, Table } from "@mantine/core";
import { MoreVertical, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import type { CSSProperties, ReactNode } from "react";
import { Link } from "../../i18n/navigation";
import { useViewMode, ViewModeToggle, type ViewMode } from "../shared/listing";
import { ActionIcon } from "./button";
import { Checkbox } from "./forms/input";
import styles from "./data-view.module.css";

export { ListingView, useViewMode, ViewModeToggle, type ViewMode } from "../shared/listing";

type Href = Parameters<typeof Link>[0]["href"];

export type Column<Row> = {
  key: string; header: ReactNode; render: (row: Row) => ReactNode;
  width?: number | string; align?: "left" | "center" | "right";
  /** Hidden below this breakpoint, so a phone keeps only what identifies the row. */
  visibleFrom?: "xs" | "sm" | "md" | "lg";
  /**
   * Its place on a card: `cover` (edge to edge on top: an image, a photo, a preview; a thumbnail of `width` in the
   * list), `title` (by default the first
   * column that names no place), `aside` (beside the title: a status, a count), `hidden` (the list only); any other
   * column is a labelled detail of the card.
   */
  card?: "cover" | "title" | "aside" | "hidden";
};

export type RowAction = { label: string; icon?: LucideIcon; onClick?: () => void; href?: Href; tone?: "danger"; hidden?: boolean; disabled?: boolean };

/** The actions of one row (or one record), behind a "more" button. Renders nothing when none is left. */
export function RowMenu({ actions, label }: { actions: ReadonlyArray<RowAction | false | null | undefined>; label?: string }) {
  const translate = useTranslations("Common.actions");
  const visible = actions.filter((action): action is RowAction => !!action && !action.hidden);
  if (!visible.length) return null;
  return <Menu position="bottom-end" shadow="md" radius="md" withinPortal>
    <Menu.Target>
      <ActionIcon variant="subtle" color="gray" radius="xl" aria-label={label ?? translate("more")} onClick={(event) => event.stopPropagation()}>
        <MoreVertical size={16} aria-hidden="true" />
      </ActionIcon>
    </Menu.Target>
    <Menu.Dropdown onClick={(event) => event.stopPropagation()}>
      {visible.map(({ label: text, icon: Icon, onClick, href, tone, disabled }) => {
        const props = { key: text, color: tone === "danger" ? "red" : undefined, disabled, leftSection: Icon ? <Icon size={15} aria-hidden="true" /> : undefined };
        return href ? <Menu.Item {...props} key={text} component={Link} href={href}>{text}</Menu.Item> : <Menu.Item {...props} key={text} onClick={onClick}>{text}</Menu.Item>;
      })}
    </Menu.Dropdown>
  </Menu>;
}

/**
 * Every list of records, as rows (`list`) or as cards (`grid`), both drawn from the same columns: on a card the
 * `cover` column on top, the title, the `aside` columns beside it and the others as labelled details. Columns say how
 * to draw a cell; rows may have actions, a selection and a way to open them; `empty` is shown when there is nothing.
 * Switching views or pages brings the items in one after the other; the table scrolls sideways on narrow screens and
 * the cards fill as many columns as fit. A listing offers both views with {@link useListingView}.
 */
export function DataView<Row>({ rows, columns, rowKey, onOpen, actions, empty, selection, minWidth = 560, view = "list" }: {
  rows: readonly Row[]; columns: ReadonlyArray<Column<Row>>; rowKey: (row: Row) => string;
  /** Clicking a row or a card opens it; the first link stays the way in for keyboards. */
  onOpen?: (row: Row) => void;
  actions?: (row: Row) => ReadonlyArray<RowAction | false | null | undefined>;
  empty?: ReactNode;
  selection?: { selected: ReadonlySet<string>; onChange: (selected: Set<string>) => void };
  minWidth?: number;
  /** Rows or cards; `useListingView` keeps the choice per listing and draws its switch. */
  view?: ViewMode;
}) {
  const translate = useTranslations("Common.table");
  if (!rows.length) return <>{empty}</>;
  const keys = rows.map(rowKey);
  const all = selection ? keys.every((key) => selection.selected.has(key)) : false;
  const toggle = (key: string) => {
    const next = new Set(selection?.selected);
    if (next.has(key)) next.delete(key); else next.add(key);
    selection?.onChange(next);
  };
  const check = (key: string) => <Checkbox aria-label={translate("select")} checked={!!selection?.selected.has(key)} onChange={() => toggle(key)} />;
  // Rows and cards come in one after the other, quickly, and only the first few wait at all.
  const stagger = (index: number): CSSProperties => ({ "--data-view-delay": `${Math.min(index, 8) * 25}ms` } as CSSProperties);

  if (view === "grid") {
    const cover = columns.find((column) => column.card === "cover");
    const title = columns.find((column) => column.card === "title") ?? columns.find((column) => !column.card);
    const asides = columns.filter((column) => column.card === "aside");
    const details = columns.filter((column) => column !== title && !column.card);
    return <ul className={styles.grid} data-view="grid">
      {rows.map((row, index) => {
        const key = keys[index];
        return <li key={key} className={styles.card} style={stagger(index)} data-open={onOpen ? "" : undefined} data-selected={selection?.selected.has(key) || undefined}
          data-cover={cover ? "" : undefined} onClick={onOpen ? () => onOpen(row) : undefined}>
          {cover && <div className={styles.cardCover}>{cover.render(row)}</div>}
          <div className={styles.cardHead}>
            {selection && <div onClick={(event) => event.stopPropagation()}>{check(key)}</div>}
            <div className={styles.cardTitle}>{title?.render(row)}</div>
            {actions && <div className={styles.cardMenu}><RowMenu actions={actions(row)} /></div>}
          </div>
          {asides.length > 0 && <div className={styles.cardAside}>{asides.map((column) => <div key={column.key}>{column.render(row)}</div>)}</div>}
          {details.length > 0 && <dl className={styles.cardDetails}>
            {details.map((column) => <div key={column.key}>{column.header && <dt>{column.header}</dt>}<dd>{column.render(row)}</dd></div>)}
          </dl>}
        </li>;
      })}
    </ul>;
  }

  return <Table.ScrollContainer minWidth={minWidth} className={styles.list} data-view="list">
    <Table verticalSpacing="sm" horizontalSpacing="md" className={styles.table} data-open={onOpen ? "" : undefined}>
      <Table.Thead>
        <Table.Tr>
          {selection && <Table.Th w={40}><Checkbox aria-label={translate("selectAll")} checked={all} indeterminate={!all && keys.some((key) => selection.selected.has(key))}
            onChange={() => selection.onChange(all ? new Set() : new Set(keys))} /></Table.Th>}
          {columns.map((column) => <Table.Th key={column.key} w={column.width} ta={column.align} visibleFrom={column.visibleFrom}>{column.header}</Table.Th>)}
          {actions && <Table.Th w={48} aria-label={translate("actions")} />}
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {rows.map((row, index) => {
          const key = keys[index];
          return <Table.Tr key={key} className={styles.row} style={stagger(index)} onClick={onOpen ? () => onOpen(row) : undefined}
            data-selected={selection?.selected.has(key) || undefined}>
            {selection && <Table.Td onClick={(event) => event.stopPropagation()}>{check(key)}</Table.Td>}
            {columns.map((column) => <Table.Td key={column.key} ta={column.align} visibleFrom={column.visibleFrom} w={column.card === "cover" ? column.width : undefined}
              className={column.card === "cover" ? styles.coverCell : undefined}>{column.render(row)}</Table.Td>)}
            {actions && <Table.Td ta="right" className={styles.rowActions}><RowMenu actions={actions(row)} /></Table.Td>}
          </Table.Tr>;
        })}
      </Table.Tbody>
    </Table>
  </Table.ScrollContainer>;
}

/**
 * Both views of a listing, the default of every list: the view remembered per browser under `listing` (cards until the
 * reader chooses) and its switch, to place in the listing's header (`Section` actions, a `FilterBar`).
 */
export function useListingView(listing: string, fallback: ViewMode = "grid"): { view: ViewMode; toggle: ReactNode; setView: (mode: ViewMode) => void } {
  const [view, setView] = useViewMode(listing, fallback);
  return { view, setView, toggle: <ViewModeToggle value={view} onChange={setView} /> };
}
