"use client";

import { ArrowDown, ArrowUp, Pencil, Plus, Trash2, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import type { z } from "zod";
import type { ApiResult } from "../admin/api-result";
import { useApiAction } from "../shared/use-api-action";
import { Button } from "./button";
import { DataView, useListingView, type Column, type RowAction } from "./data-view";
import { FormModal, type FormField } from "./forms/auto-form";
import { Section } from "./layout";
import { useConfirmation } from "./use-confirmation";

/**
 * A whole "manage these items" block: the list, the dialog that creates and edits one, the confirmation that
 * removes one and, when the items have an order, the arrows that change it. Every simple vocabulary of the product
 * (categories, tags, stages, areas...) is one call of this, differing only in its fields, columns and actions.
 */
export function ResourceManager<Item extends { id: string }, Values extends Record<string, unknown>>({
  title, description, icon, items, columns, fields, schema, blank, toValues, labels, save, remove, reorder, canManage = true, empty, removable, listing, itemActions, errors,
}: {
  title: string; description?: string; icon?: LucideIcon;
  items: readonly Item[]; columns: ReadonlyArray<Column<Item>>;
  fields: ReadonlyArray<FormField<Values>>; schema?: z.ZodType;
  /** The values of a new item, and those of an existing one. */
  blank: Values; toValues: (item: Item) => Values;
  labels: { add: string; edit: string; removeTitle: string; removeDescription: (item: Item) => string; saved?: string; removed?: string };
  save: (id: string | null, values: Values) => Promise<ApiResult<unknown>>;
  remove?: (id: string) => Promise<ApiResult<unknown>>;
  /** Present: the items have an order, changed with the arrows; receives every id in the new order. */
  reorder?: (ids: string[]) => Promise<ApiResult<unknown>>;
  canManage?: boolean; empty?: ReactNode;
  /** Whether this item may be removed (a system item may not). */
  removable?: (item: Item) => boolean;
  /** Names the list for remembering its view (cards or rows); the title is used when left out. */
  listing?: string;
  /** The item's own actions besides edit, move and remove ("make default"), shown after edit. */
  itemActions?: (item: Item) => ReadonlyArray<RowAction | false | null | undefined>;
  /** Own wording for the dialog's refusals, by kind or by the API's `code`. */
  errors?: Partial<Record<string, string>>;
}) {
  const translate = useTranslations("Common.actions");
  const router = useRouter();
  const confirmation = useConfirmation();
  const order = useApiAction(async (ids: string[]) => reorder!(ids));
  const [editing, setEditing] = useState<Item | "new">();
  const listView = useListingView(listing ?? `resource:${title}`);
  const move = async (index: number, offset: number) => {
    const ids = items.map((item) => item.id);
    [ids[index], ids[index + offset]] = [ids[index + offset], ids[index]];
    if ((await order.run(ids)).ok) router.refresh();
  };
  return <Section title={title} description={description} icon={icon} flush
    actions={<>
      {items.length > 0 && listView.toggle}
      {canManage && <Button size="xs" leftSection={<Plus size={14} aria-hidden="true" />} onClick={() => setEditing("new")}>{labels.add}</Button>}
    </>}>
    <DataView rows={items} columns={columns} rowKey={(item) => item.id} empty={empty} minWidth={420} view={listView.view}
      actions={canManage ? (item) => {
        const index = items.indexOf(item);
        return [
          { label: translate("edit"), icon: Pencil, onClick: () => setEditing(item) },
          ...(itemActions?.(item) ?? []),
          reorder && { label: translate("moveUp"), icon: ArrowUp, onClick: () => void move(index, -1), disabled: index === 0 || order.pending },
          reorder && { label: translate("moveDown"), icon: ArrowDown, onClick: () => void move(index, 1), disabled: index === items.length - 1 || order.pending },
          remove && (!removable || removable(item)) && { label: translate("delete"), icon: Trash2, tone: "danger" as const, onClick: () => confirmation.ask({
            title: labels.removeTitle, description: labels.removeDescription(item), run: () => remove(item.id), success: labels.removed, done: () => router.refresh(),
          }) },
        ];
      } : undefined} />
    <FormModal opened={!!editing} onClose={() => setEditing(undefined)} title={editing === "new" ? labels.add : labels.edit} fields={fields} schema={schema}
      initial={editing && editing !== "new" ? toValues(editing) : blank} success={labels.saved} errors={errors}
      onSubmit={(values) => save(editing && editing !== "new" ? editing.id : null, values)} />
    {confirmation.dialog}
  </Section>;
}
