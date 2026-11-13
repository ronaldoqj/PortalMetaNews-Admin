"use client";

import { AspectRatio, Group, Loader, Stack, Tabs, Text, Tooltip } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { Eye, History, Languages, PencilLine, RefreshCw, Save, Wand2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { resolveI18nString } from "../../i18n/i18n-string";
import { CONTENT_LOCALES, type ContentLocale } from "../../i18n/locales";
import { useRouter } from "../../i18n/navigation";
import type { ApiFailure } from "../admin/api-result";
import { ArticleBody } from "../forms/article-body";
import { useApiErrorMessage } from "../shared/use-api-action";
import { Button, Notice, Page, Section, SegmentedControl, Textarea, TextInput, Title, useConfirmation, useFormat } from "../ui";
import { ArticleEditor, type ArticleEditorLabels } from "../ui/forms/article-editor";
import { changeNewsStatus, deleteNews, saveNews } from "./actions";
import { BuilderSidebar } from "./builder-sidebar";
import { patchOf, stateOf, type BuilderState } from "./builder-state";
import { NEWS_LIMITS, type AiStatus, type Author, type Category, type MediaBrief, type NewsAction, type NewsView } from "./contracts";
import { useMediaPicker } from "./media-picker";
import { RevisionsDrawer } from "./revisions-drawer";
import { NewsStatusBadge } from "./status";
import { SyncBar } from "./sync-bar";
import { otherLocale, resumeOverwrites, type Content, type SyncField } from "./translation-sync";
import { useTranslationSync } from "./use-translation-sync";
import styles from "./newsroom.module.css";

/** How often unsaved changes are saved on their own. */
const AUTOSAVE_MS = 20_000;

type TagOption = { id: string; name: Record<string, string | undefined> };

/**
 * The news builder: the item's content in both languages (title, subtitle, body, SEO, cover caption, address), kept
 * in step by the automatic translation (`use-translation-sync.ts`), beside its publication, languages, classification,
 * cover and highlights. Changes are saved on request, every 20 seconds and when a field is left; a save made by someone
 * else in the meantime is never overwritten (the API answers `news_conflict`).
 */
export function NewsBuilder({ news, categories, authors, ai, can, siteOrigin }: {
  news: NewsView; categories: readonly Category[]; authors: readonly Author[]; ai: AiStatus | null;
  can: { ai: boolean; editAll: boolean; createTags: boolean }; siteOrigin: string;
}) {
  const translate = useTranslations("Builder");
  const router = useRouter();
  const format = useFormat();
  const message = useApiErrorMessage();
  const confirmation = useConfirmation();
  const [view, setView] = useState(news);
  const [state, setState] = useState<BuilderState>(() => stateOf(news));
  const [cover, setCover] = useState<MediaBrief | null>(news.cover);
  const [tags, setTags] = useState<TagOption[]>(news.tags);
  const [editing, setEditing] = useState<ContentLocale>(news.translation.source);
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [resuming, setResuming] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [autosaveError, setAutosaveError] = useState(false);
  const [history, setHistory] = useState(false);
  // The state last saved: rendered (what is dirty) and read by the saves through its ref.
  const [savedState, setSavedState] = useState<BuilderState>(() => stateOf(news));
  const saved = useRef<BuilderState>(savedState);
  const markSaved = useCallback((next: BuilderState) => { saved.current = next; setSavedState(next); }, []);
  const stateRef = useRef(state);
  const viewRef = useRef(view);
  const savingRef = useRef(false);
  const conflictRef = useRef(false);
  useEffect(() => { stateRef.current = state; viewRef.current = view; conflictRef.current = conflict; }, [state, view, conflict]);

  const editable = view.permissions.edit;
  const aiActive = !!ai?.available && can.ai && editable;
  const setContent = useCallback((content: Content) => setState((current) => ({ ...current, content })), []);
  const setSync = useCallback((translation: BuilderState["translation"]) => setState((current) => ({ ...current, translation })), []);
  const sync = useTranslationSync({ content: state.content, setContent, sync: state.translation, setSync, active: aiActive });
  const picker = useMediaPicker(ai, { promptHint: state.content[editing].title });
  const dirty = useMemo(() => Object.keys(patchOf(savedState, state)).length > 0, [savedState, state]);

  const save = useCallback(async (auto: boolean): Promise<boolean> => {
    if (savingRef.current || !viewRef.current.permissions.edit || conflictRef.current) return false;
    const current = stateRef.current;
    const patch = patchOf(saved.current, current);
    if (!Object.keys(patch).length) return true;
    savingRef.current = true;
    setSaving(true);
    const result = await saveNews(viewRef.current.id, { ...patch, expectedUpdatedAt: viewRef.current.updatedAt })
      .catch((): ApiFailure => ({ ok: false, error: "unavailable" }));
    savingRef.current = false;
    setSaving(false);
    if (!result.ok) {
      if (result.code === "news_conflict") setConflict(true);
      else if (auto) setAutosaveError(true);
      else notifications.show({ color: "red", message: message(result, { body_invalid: translate("errors.body"), slug_invalid: translate("errors.slug"), news_incomplete: translate("errors.incomplete") }) });
      return false;
    }
    setAutosaveError(false);
    // Addresses come back from the API (generated from the title, or made unique): take them unless retyped meanwhile.
    const slug = { ...stateRef.current.slug };
    for (const locale of CONTENT_LOCALES) if ((stateRef.current.slug[locale] ?? "") === (current.slug[locale] ?? "")) slug[locale] = result.data.slug[locale] ?? "";
    markSaved({ ...current, slug: { ...result.data.slug } });
    setState((latest) => ({ ...latest, slug }));
    setView(result.data);
    if (!auto) notifications.show({ color: "teal", message: translate("saved") });
    return true;
  }, [markSaved, message, translate]);

  useEffect(() => {
    const timer = setInterval(() => { if (Object.keys(patchOf(saved.current, stateRef.current)).length) void save(true); }, AUTOSAVE_MS);
    return () => clearInterval(timer);
  }, [save]);
  const saveSoon = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const onLeaveField = useCallback(() => {
    clearTimeout(saveSoon.current);
    saveSoon.current = setTimeout(() => void save(true), 1500);
  }, [save]);
  useEffect(() => () => clearTimeout(saveSoon.current), []);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const change = (patch: Partial<BuilderState>) => setState((current) => ({ ...current, ...patch }));
  const toggleSync = (enabled: boolean) => setSync({ ...state.translation, enabled });
  const resume = (source: ContentLocale) => {
    const run = async () => {
      setResuming(true);
      const ok = await sync.resume(source);
      setResuming(false);
      if (ok) setEditing(source);
    };
    if (!resumeOverwrites(state.content, source)) return void run();
    confirmation.ask({
      title: translate("sync.confirmTitle", { from: source.toUpperCase(), to: otherLocale(source).toUpperCase() }),
      description: translate("sync.confirmDescription", { to: otherLocale(source).toUpperCase() }), tone: "warning", confirmLabel: translate("sync.confirm"),
      run: async () => { await run(); },
    });
  };

  async function act(action: NewsAction, scheduledAt?: string) {
    setBusy(true);
    if (dirty && !(await save(false))) { setBusy(false); return; }
    const result = await changeNewsStatus(view.id, { action, scheduledAt }).catch((): ApiFailure => ({ ok: false, error: "unavailable" }));
    setBusy(false);
    if (!result.ok) {
      notifications.show({ color: "red", message: message(result, {
        news_incomplete: translate("errors.incomplete"), news_no_locale: translate("errors.noLocale"), schedule_invalid: translate("errors.schedule"),
        news_status_invalid: translate("errors.status"),
      }) });
      return;
    }
    setView(result.data);
    notifications.show({ color: "teal", message: translate(`done.${action}`) });
    router.refresh();
  }

  const remove = () => confirmation.ask({
    title: translate("deleteTitle"), description: translate("deleteDescription"), confirmLabel: translate("delete"),
    run: () => deleteNews(view.id), success: translate("deleted"), errors: { news_published: translate("errors.deletePublished") },
    done: () => { markSaved(stateRef.current); router.push("/panel/news"); },
  });

  const pickCover = async () => {
    const item = await picker.pick();
    if (!item) return;
    setCover(item);
    change({ coverMediaId: item.id });
  };
  const pickBodyImage = useCallback(async () => {
    const item = await picker.pick();
    return item ? { id: item.id, alt: item.alt[editing] ?? resolveI18nString(item.alt, editing) } : null;
  }, [picker, editing]);

  const editorLabels: ArticleEditorLabels = useMemo(() => Object.fromEntries((["toolbar", "bold", "italic", "underline", "strike", "h2", "h3", "bulletList",
    "orderedList", "blockquote", "hr", "link", "unlink", "undo", "redo", "clear", "image"] as const).map((key) => [key, translate(`editor.${key}`)])) as ArticleEditorLabels, [translate]);

  const status = saving ? <Group gap={6}><Loader size={12} /><Text size="sm" c="dimmed">{translate("saving")}</Text></Group>
    : autosaveError ? <Text size="sm" c="red">{translate("autosaveFailed")}</Text>
      : dirty ? <Text size="sm" c="orange">{translate("unsaved")}</Text>
        : <Text size="sm" c="dimmed">{translate("savedAt", { when: format.relative(view.updatedAt) })}</Text>;

  const title = state.content[editing].title || state.content[otherLocale(editing)].title;
  return <Page title={title || translate("untitled")}
    description={<Group gap="sm" component="span"><NewsStatusBadge status={view.status} />{status}</Group>}
    actions={<>
      <SegmentedControl size="xs" value={mode} onChange={(value) => setMode(value === "preview" ? "preview" : "edit")} data={[
        { value: "edit", label: <Group gap={4} wrap="nowrap"><PencilLine size={14} aria-hidden="true" />{translate("modes.edit")}</Group> },
        { value: "preview", label: <Group gap={4} wrap="nowrap"><Eye size={14} aria-hidden="true" />{translate("modes.preview")}</Group> },
      ]} />
      <Button variant="default" leftSection={<History size={16} aria-hidden="true" />} onClick={() => setHistory(true)}>{translate("history")}</Button>
      {editable && <Button leftSection={<Save size={16} aria-hidden="true" />} loading={saving} disabled={!dirty || conflict} onClick={() => void save(false)}>{translate("save")}</Button>}
    </>}>
    {!editable && <Notice tone="neutral">{translate("readOnly")}</Notice>}
    {conflict && <Notice tone="warning" title={translate("conflictTitle")}>
      <Stack gap="xs"><Text size="sm">{translate("conflict")}</Text>
        <Group><Button size="xs" leftSection={<RefreshCw size={14} aria-hidden="true" />} onClick={() => window.location.reload()}>{translate("reload")}</Button></Group></Stack>
    </Notice>}
    <div className={styles.builder}>
      <Stack gap="md" miw={0}>
        <SyncBar sync={state.translation} ai={ai} canUseAi={can.ai} editable={editable} simulated={sync.simulated} failure={sync.failure} resuming={resuming}
          onToggle={toggleSync} onResume={resume} />
        <Tabs value={editing} onChange={(value) => value && setEditing(value === "en" ? "en" : "pt")}>
          <Tabs.List>
            {CONTENT_LOCALES.map((locale) => <Tabs.Tab key={locale} value={locale} leftSection={<Languages size={14} aria-hidden="true" />}
              rightSection={state.translation.enabled && aiActive ? <Text size="xs" c="dimmed">{locale === state.translation.source ? translate("sync.sourceTag") : translate("sync.targetTag")}</Text> : undefined}>
              {translate(`languages.${locale}`)}
            </Tabs.Tab>)}
          </Tabs.List>
          {CONTENT_LOCALES.map((locale) => <Tabs.Panel key={locale} value={locale} pt="md">
            {mode === "preview"
              ? <Preview content={state.content[locale]} cover={cover} locale={locale} />
              : <LanguageFields locale={locale} state={state} disabled={!editable} cover={cover} sync={sync} labels={editorLabels}
                onEdit={sync.edit} onSlug={(value) => change({ slug: { ...state.slug, [locale]: value } })}
                onBlur={onLeaveField} pickImage={pickBodyImage} live={view.status === "published" || view.status === "scheduled"} />}
          </Tabs.Panel>)}
        </Tabs>
      </Stack>
      <aside className={styles.sidebar} aria-label={translate("sidebar")}>
        <BuilderSidebar view={view} state={state} editable={editable} categories={categories} authors={authors} tags={tags} cover={cover} siteOrigin={siteOrigin}
          can={can} busy={busy || saving} onChange={change} onTags={(ids, options) => { setTags(options); change({ tagIds: ids }); }}
          onAction={(action, at) => void act(action, at)} onDelete={remove} onPickCover={() => void pickCover()} />
      </aside>
    </div>
    <RevisionsDrawer newsId={view.id} opened={history} onClose={() => setHistory(false)} language={editing} canRestore={editable}
      onRestored={(restored) => {
        const next = stateOf(restored);
        markSaved(next);
        sync.reset(next.content);
        setState(next);
        setView(restored);
        setCover(restored.cover);
        setTags(restored.tags);
      }} />
    {picker.element}
    {confirmation.dialog}
  </Page>;
}

/** The label of a synced field: what it is, and whether the translation is writing it or wrote it. */
function FieldLabel({ label, pending, automatic }: { label: string; pending: boolean; automatic: boolean }) {
  const translate = useTranslations("Builder.sync");
  return <Group gap={8} component="span" wrap="nowrap">
    <span>{label}</span>
    {pending && <span className={styles.autoMark}><Loader size={10} />{translate("translating")}</span>}
    {!pending && automatic && <Tooltip label={translate("automaticHint")}><span className={styles.autoMark}><Wand2 size={12} aria-hidden="true" />{translate("automatic")}</span></Tooltip>}
  </Group>;
}

function LanguageFields({ locale, state, disabled, cover, sync, labels, onEdit, onSlug, onBlur, pickImage, live }: {
  locale: ContentLocale; state: BuilderState; disabled: boolean; cover: MediaBrief | null; labels: ArticleEditorLabels; live: boolean;
  sync: { isPending: (locale: ContentLocale, field: SyncField) => boolean; isAutomatic: (locale: ContentLocale, field: SyncField) => boolean };
  onEdit: (locale: ContentLocale, field: SyncField, value: string) => void; onSlug: (value: string) => void; onBlur: () => void;
  pickImage: () => Promise<{ id: string; alt: string } | null>;
}) {
  const translate = useTranslations("Builder");
  const content = state.content[locale];
  const label = (field: SyncField, text: string): ReactNode => <FieldLabel label={text} pending={sync.isPending(locale, field)} automatic={sync.isAutomatic(locale, field)} />;
  const counter = (value: string, max: number) => translate("counter", { count: value.length, max });
  const onBodyChange = useCallback((html: string) => onEdit(locale, "body", html), [onEdit, locale]);
  return <Stack gap="md" lang={locale}>
    <TextInput label={label("title", translate("fields.title"))} value={content.title} onChange={(event) => onEdit(locale, "title", event.currentTarget.value)} onBlur={onBlur}
      maxLength={NEWS_LIMITS.title} disabled={disabled} placeholder={translate("placeholders.title")} className={styles.titleInput} />
    <Textarea label={label("subtitle", translate("fields.subtitle"))} description={translate("help.subtitle")} value={content.subtitle} autosize minRows={2}
      onChange={(event) => onEdit(locale, "subtitle", event.currentTarget.value)} onBlur={onBlur} maxLength={NEWS_LIMITS.subtitle} disabled={disabled} />
    <Stack gap={4}>
      <Text size="sm" fw={500} component="div">{label("body", translate("fields.body"))}</Text>
      <ArticleEditor value={content.body} onChange={onBodyChange} onBlur={onBlur} labels={labels} placeholder={translate("placeholders.body")}
        pickImage={pickImage} disabled={disabled} lang={locale} />
    </Stack>
    {cover && <TextInput label={label("coverCaption", translate("fields.coverCaption"))} value={content.coverCaption} onBlur={onBlur}
      onChange={(event) => onEdit(locale, "coverCaption", event.currentTarget.value)} maxLength={NEWS_LIMITS.caption} disabled={disabled} />}
    <Section title={translate("seo.title")} description={translate("seo.description")}>
      <Stack gap="sm">
        <TextInput label={translate("fields.slug")} description={live ? translate("help.slugLive") : translate("help.slug")} value={state.slug[locale] ?? ""}
          onChange={(event) => onSlug(event.currentTarget.value.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-{2,}/g, "-"))} onBlur={onBlur}
          maxLength={NEWS_LIMITS.slug} disabled={disabled} leftSection={<Text size="xs" c="dimmed">/</Text>} />
        <TextInput label={label("seoTitle", translate("fields.seoTitle"))} description={counter(content.seoTitle, NEWS_LIMITS.seoTitle)} value={content.seoTitle}
          onChange={(event) => onEdit(locale, "seoTitle", event.currentTarget.value)} onBlur={onBlur} maxLength={NEWS_LIMITS.seoTitle} disabled={disabled} placeholder={content.title} />
        <Textarea label={label("seoDescription", translate("fields.seoDescription"))} description={counter(content.seoDescription, NEWS_LIMITS.seoDescription)}
          value={content.seoDescription} autosize minRows={2} onChange={(event) => onEdit(locale, "seoDescription", event.currentTarget.value)} onBlur={onBlur}
          maxLength={NEWS_LIMITS.seoDescription} disabled={disabled} placeholder={content.subtitle} />
      </Stack>
    </Section>
  </Stack>;
}

/** The current language as the site will show it: title, subtitle, cover and body. */
function Preview({ content, cover, locale }: { content: Content[ContentLocale]; cover: MediaBrief | null; locale: ContentLocale }) {
  const translate = useTranslations("Builder");
  return <Stack gap="md" lang={locale} maw={760}>
    <Title order={1}>{content.title || translate("untitled")}</Title>
    {content.subtitle && <Text size="lg" c="dimmed">{content.subtitle}</Text>}
    {cover && <figure className="article-figure">
      <AspectRatio ratio={cover.width / cover.height} style={{ backgroundColor: cover.color }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- same-origin immutable rendition */}
        <img src={`/media/${cover.id}/lg`} alt={cover.alt[locale] ?? ""} />
      </AspectRatio>
      {content.coverCaption && <figcaption>{content.coverCaption}</figcaption>}
    </figure>}
    <ArticleBody html={content.body} labels={{ aiImage: translate("aiImage") }} />
  </Stack>;
}
