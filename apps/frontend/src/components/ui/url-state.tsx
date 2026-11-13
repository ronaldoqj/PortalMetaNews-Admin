"use client";

import { Group } from "@mantine/core";
import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, useTransition, type ReactNode } from "react";
import { ListingFooter } from "../shared/listing";
import { Select, TextInput } from "./forms/input";

/**
 * A list keeps its search, filters and page in the address, so a link reproduces the view and the server renders
 * it. `set` changes some of them (an empty value removes one) and goes back to the first page unless told not to.
 */
export function useUrlState() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const set = useCallback((patch: Record<string, string | number | null | undefined>, keepPage = false) => {
    const next = new URLSearchParams(params.toString());
    if (!keepPage) next.delete("page");
    for (const [name, value] of Object.entries(patch)) {
      if (value === null || value === undefined || value === "") next.delete(name);
      else next.set(name, String(value));
    }
    const query = next.toString();
    startTransition(() => router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false }));
  }, [router, pathname, params]);
  return { get: (name: string) => params.get(name) ?? "", set, pending };
}

/** The search of a list (`?q=`), applied a moment after the person stops typing. */
export function SearchField({ param = "q", placeholder, label, width = 280 }: { param?: string; placeholder?: string; label: string; width?: number }) {
  const url = useUrlState();
  const current = url.get(param);
  const [value, setValue] = useState(current);
  const { set } = url;
  useEffect(() => {
    if (value.trim() === current) return;
    const timer = setTimeout(() => set({ [param]: value.trim() }), 300);
    return () => clearTimeout(timer);
  }, [value, current, param, set]);
  return <TextInput type="search" value={value} onChange={(event) => setValue(event.currentTarget.value)} placeholder={placeholder ?? label} aria-label={label}
    leftSection={<Search size={16} aria-hidden="true" />} maxLength={200} w={{ base: "100%", sm: width }} />;
}

/** One filter of a list, kept in the address under `param`; clearing it removes the filter. */
export function FilterSelect({ param, data, label, width = 190 }: { param: string; data: ReadonlyArray<{ value: string; label: string }>; label: string; width?: number }) {
  const url = useUrlState();
  return <Select data={[...data]} value={url.get(param) || null} onChange={(value) => url.set({ [param]: value })} placeholder={label} aria-label={label}
    clearable searchable={data.length > 8} w={{ base: "100%", xs: width }} />;
}

/** The row above a list: search and filters on the left, the view's own actions on the right. */
export function FilterBar({ children, end }: { children: ReactNode; end?: ReactNode }) {
  return <Group justify="space-between" gap="sm" align="center">
    <Group gap="sm" style={{ flex: "1 1 320px" }}>{children}</Group>
    {end && <Group gap="xs">{end}</Group>}
  </Group>;
}

/** The count of a list and its pages, the page kept in the address (`?page=`). */
export function Pager({ total, pageSize, label }: { total: number; pageSize: number; label: string }) {
  const url = useUrlState();
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(1, Number(url.get("page")) || 1), pages);
  return <ListingFooter total={total} label={label} page={page} pages={pages} onChange={(next) => url.set({ page: next === 1 ? null : next }, true)} disabled={url.pending} />;
}
