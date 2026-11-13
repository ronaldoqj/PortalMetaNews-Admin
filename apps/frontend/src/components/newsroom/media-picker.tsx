"use client";

import { Center, Group, Loader, Pagination, Stack, Tabs, Text } from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { Images, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { EmptyState, Modal, Notice, SegmentedControl, TextInput } from "../ui";
import { listMedia } from "./actions";
import type { AiStatus, MediaItem, MediaList } from "./contracts";
import { MediaGenerator, MediaGrid, MediaUploader } from "./media-shared";

/**
 * Chooses an image of the media library, or adds one on the way (upload, or generation by the AI): what the builder's
 * cover and the body's images use. `useMediaPicker().pick()` resolves with the chosen image, or null when closed.
 */
export function useMediaPicker(ai: AiStatus | null, options: { promptHint?: string } = {}): { pick: () => Promise<MediaItem | null>; element: ReactNode } {
  const [opened, setOpened] = useState(false);
  const resolver = useRef<((item: MediaItem | null) => void) | null>(null);
  const finish = useCallback((item: MediaItem | null) => {
    resolver.current?.(item);
    resolver.current = null;
    setOpened(false);
  }, []);
  const pick = useCallback(() => new Promise<MediaItem | null>((resolve) => { resolver.current = resolve; setOpened(true); }), []);
  return { pick, element: <MediaPicker opened={opened} ai={ai} promptHint={options.promptHint} onClose={() => finish(null)} onSelect={(item) => finish(item)} /> };
}

export function MediaPicker({ opened, ai, onClose, onSelect, promptHint }: {
  opened: boolean; ai: AiStatus | null; onClose: () => void; onSelect: (item: MediaItem) => void; promptHint?: string;
}) {
  const translate = useTranslations("Media");
  const [tab, setTab] = useState<string | null>("library");
  return <Modal opened={opened} onClose={onClose} title={translate("pickerTitle")} size="xl" radius="lg" closeOnClickOutside>
    {opened && <Tabs value={tab} onChange={setTab} keepMounted={false}>
      <Tabs.List mb="md">
        <Tabs.Tab value="library">{translate("tabs.library")}</Tabs.Tab>
        <Tabs.Tab value="upload">{translate("tabs.upload")}</Tabs.Tab>
        <Tabs.Tab value="generate">{translate("tabs.generate")}</Tabs.Tab>
      </Tabs.List>
      <Tabs.Panel value="library"><LibraryBrowser onSelect={onSelect} /></Tabs.Panel>
      <Tabs.Panel value="upload"><MediaUploader onUploaded={onSelect} /></Tabs.Panel>
      <Tabs.Panel value="generate"><MediaGenerator ai={ai} onGenerated={onSelect} initialPrompt={promptHint} /></Tabs.Panel>
    </Tabs>}
  </Modal>;
}

/** The library inside the picker: search, source and pages kept in the dialog, not in the page's address. */
function LibraryBrowser({ onSelect }: { onSelect: (item: MediaItem) => void }) {
  const translate = useTranslations("Media");
  const [search, setSearch] = useState("");
  const [debounced] = useDebouncedValue(search, 300);
  const [source, setSource] = useState("all");
  const [page, setPage] = useState(1);
  const [state, setState] = useState<{ data?: MediaList; failed?: boolean; loading: boolean }>({ loading: true });
  useEffect(() => {
    let active = true;
    // The loading state is set by the handlers that change the query, so the effect only fetches.
    void listMedia({ search: debounced || undefined, source: source === "all" ? undefined : source, page }).then((result) => {
      if (active) setState(result.ok ? { data: result.data, loading: false } : { failed: true, loading: false });
    });
    return () => { active = false; };
  }, [debounced, source, page]);
  const pages = state.data ? Math.max(1, Math.ceil(state.data.total / state.data.pageSize)) : 1;
  return <Stack gap="md">
    <Group gap="sm">
      <TextInput type="search" value={search} onChange={(event) => { setSearch(event.currentTarget.value); setPage(1); }} placeholder={translate("search")}
        aria-label={translate("search")} leftSection={<Search size={16} aria-hidden="true" />} style={{ flex: 1 }} />
      <SegmentedControl value={source} onChange={(value) => { setSource(value); setPage(1); }} size="xs"
        data={[{ value: "all", label: translate("sources.all") }, { value: "upload", label: translate("sources.upload") }, { value: "ai", label: translate("sources.ai") }]} />
    </Group>
    {state.loading && !state.data ? <Center py="xl"><Loader /></Center>
      : state.failed ? <Notice tone="danger">{translate("errors.load")}</Notice>
        : !state.data?.items.length ? <EmptyState icon={Images} title={translate("empty")} description={translate("emptyHint")} plain />
          : <MediaGrid items={state.data.items} onSelect={onSelect} />}
    {pages > 1 && <Group justify="space-between">
      <Text size="sm" c="dimmed">{translate("count", { count: state.data?.total ?? 0 })}</Text>
      <Pagination size="sm" total={pages} value={page} onChange={setPage} />
    </Group>}
  </Stack>;
}
