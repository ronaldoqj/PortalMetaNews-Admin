"use client";

import { Drawer, Text } from "@mantine/core";
import {
  ArrowDown, ArrowUp, Check, CircleAlert, ImageIcon, Lightbulb, Link2, ListChecks, Menu, MessageSquarePlus, PenLine, Pencil, PenTool, Search, Sparkles, Square,
  Trash2, Wand2,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { getPathname, Link, useRouter } from "../../i18n/navigation";
import type { AppLocale } from "../../i18n/routing";
import {
  ActionIcon, Button, FormModal, Notice, RowMenu, Select, StatusBadge, Switch, TextInput, Title, Tooltip, useApiErrorMessage, useConfirmation, useFormat,
} from "../ui";
import { SegmentedControl } from "../ui/forms/input";
import { createConversation, loadConversation, removeConversation, renameConversation } from "./actions";
import { ArticleMarkdown } from "./article-markdown";
import {
  BRIEF_MAX, chosenStyle, DEFAULT_OPTIONS, NO_STYLE, WRITER_LANGUAGES, WRITER_LENGTHS, WRITER_TONES, type AiStatus, type Conversation, type ConversationDetail, type Proposal,
  type SectionNames, type WriterMedia, type WriterMessage, type WriterOptions, type WriterStage, type WriterStyle,
} from "./contracts";
import { ProposalCard } from "./proposal-card";
import { useWriterStream } from "./use-writer-stream";
import styles from "./writer.module.css";

type Live = { stage: WriterStage; text: string; proposal?: Proposal };

const STAGES = [{ stage: "writing", icon: PenLine }, { stage: "structuring", icon: ListChecks }, { stage: "illustrating", icon: ImageIcon }] as const;
/** Refusals the writer words itself; any other code falls back to `Common.errors`. */
const CODES = [
  "ai_unconfigured", "ai_disabled", "ai_key_rejected", "ai_provider_failed", "ai_images_unavailable", "answer_in_progress", "brief_invalid",
  "structure_failed", "image_failed", "interrupted", "proposal_missing", "writer_options_invalid", "failed",
] as const;

/**
 * The AI writer: the account's conversations, the one open (briefs, articles written live, their bilingual proposals and
 * covers) and, before the first brief, what to include and a few examples. A conversation is created on the first
 * brief (linked to a news item when the page was opened from one) and the address follows it without reloading.
 */
export function WriterWorkspace({ status, conversations: initialList, conversation, linkNewsId, sections, editorialStyles, canWrite, canIllustrate, canConfigure }: {
  status: AiStatus; conversations: Conversation[]; conversation: ConversationDetail | null; linkNewsId: string | null; sections: SectionNames;
  editorialStyles: readonly WriterStyle[]; canWrite: boolean; canIllustrate: boolean; canConfigure: boolean;
}) {
  const t = useTranslations("Writer");
  const common = useTranslations("Common.actions");
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  const format = useFormat();
  const errorMessage = useApiErrorMessage();
  const confirmation = useConfirmation();
  const { stream, stop, running } = useWriterStream();
  const [conversations, setConversations] = useState(initialList);
  const [current, setCurrent] = useState<Conversation | null>(conversation);
  const [messages, setMessages] = useState<WriterMessage[]>(conversation?.messages ?? []);
  const [media, setMedia] = useState<Map<string, WriterMedia>>(new Map(conversation?.media.map((item) => [item.id, item])));
  const [options, setOptions] = useState<WriterOptions>(conversation?.options ?? DEFAULT_OPTIONS);
  const [brief, setBrief] = useState("");
  const [live, setLiveState] = useState<Live | null>(null);
  const liveRef = useRef<Live | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [drawer, setDrawer] = useState(false);
  const [renaming, setRenaming] = useState<Conversation | null>(null);
  const [query, setQuery] = useState("");
  const [shown, setShown] = useState<Set<string>>(new Set());
  const scroller = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  const [near, setNear] = useState(true);
  const codes: Record<string, string> = Object.fromEntries(CODES.map((code) => [code, t(`errors.${code}`)]));
  const setLive = (next: Live | null) => { liveRef.current = next; setLiveState(next); };
  const linked = current?.newsId ?? linkNewsId;
  const disabled = !status.available;

  useEffect(() => {
    const element = scroller.current;
    if (element && stick.current) element.scrollTop = element.scrollHeight;
  }, [messages, live]);

  function onScroll() {
    const element = scroller.current;
    if (!element) return;
    stick.current = element.scrollHeight - element.scrollTop - element.clientHeight < 96;
    setNear(stick.current);
  }
  function applyConversation(next: Conversation) {
    setCurrent((open) => open?.id === next.id ? next : open);
    setConversations((list) => [next, ...list.filter((item) => item.id !== next.id)]);
  }
  function addMedia(item: WriterMedia) {
    setMedia((map) => new Map(map).set(item.id, item));
  }
  function startNew() {
    stop();
    setCurrent(null); setMessages([]); setMedia(new Map()); setLive(null); setFailure(null); setDrawer(false); setOptions(DEFAULT_OPTIONS);
    router.push("/panel/ai-writer");
  }
  async function reload(conversationId: string) {
    const fresh = await loadConversation(conversationId);
    if (!fresh.ok) return;
    setMessages(fresh.data.messages);
    setMedia(new Map(fresh.data.media.map((item) => [item.id, item])));
    applyConversation(fresh.data);
  }

  async function ask(content: string): Promise<boolean> {
    setFailure(null);
    let target = current;
    if (!target) {
      const created = await createConversation({ options, newsId: linkNewsId });
      if (!created.ok) { setFailure(errorMessage(created, codes)); return false; }
      target = created.data;
      setCurrent(target);
      setConversations((list) => [created.data, ...list]);
      window.history.replaceState(null, "", getPathname({ locale, href: { pathname: "/panel/ai-writer/[id]", params: { id: target.id } } }));
    }
    const pending = `pending-${crypto.randomUUID()}`;
    setMessages((list) => [...list, {
      id: pending, role: "user", content, proposal: null, mediaIds: [], status: "complete", errorCode: null, provider: null, model: null, createdAt: new Date().toISOString(),
    }]);
    setLive({ stage: "writing", text: "" });
    stick.current = true;
    const conversationId = target.id;
    let failed: string | null = null;
    const result = await stream(`/${locale}/api/panel/ai-writer/conversations/${conversationId}/messages`, { content, options }, (event) => {
      const now = liveRef.current;
      switch (event.type) {
        case "user": return setMessages((list) => list.map((message) => message.id === pending ? event.message : message));
        case "status": return now && setLive({ ...now, stage: event.stage });
        case "delta": return now && setLive({ ...now, text: now.text + event.text });
        case "proposal": return now && setLive({ ...now, proposal: event.proposal });
        case "image": return addMedia(event.media);
        case "done":
          applyConversation(event.conversation);
          setLive(null);
          setMessages((list) => [...list, event.message]);
          return;
        case "error": failed = event.code; return;
      }
    });
    if (result.ok && !liveRef.current && !failed) return true;
    // Stopped, cut or refused midway: the API keeps what was written; the conversation is read again once it has.
    setLive(null);
    if (failed || (!result.ok && result.error !== "aborted")) setFailure(failed ? codes[failed] ?? codes.failed : errorMessage(result as { error: "unavailable" }, codes));
    setTimeout(() => void reload(conversationId), 700);
    if (!result.ok && result.error !== "aborted" && !failed) {
      setMessages((list) => list.filter((message) => message.id !== pending));
      return false;
    }
    return true;
  }

  async function send() {
    const content = brief.trim();
    if (!content || running || disabled) return;
    setBrief("");
    if (!(await ask(content))) setBrief(content);
  }

  function remove(item: Conversation) {
    confirmation.ask({
      title: t("remove.title"), description: t("remove.description", { title: item.title || t("untitled") }), tone: "danger", confirmLabel: common("delete"),
      run: () => removeConversation(item.id), success: t("remove.done"),
      done: () => { setConversations((list) => list.filter((entry) => entry.id !== item.id)); if (item.id === current?.id) startNew(); },
    });
  }

  const visible = conversations.filter((item) => item.title.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  const list = <nav className={styles.list} aria-label={t("list.label")}>
    <Button leftSection={<MessageSquarePlus size={16} aria-hidden="true" />} variant="light" fullWidth onClick={startNew}>{t("list.new")}</Button>
    <TextInput size="sm" leftSection={<Search size={14} aria-hidden="true" />} placeholder={t("list.search")} aria-label={t("list.search")} value={query}
      onChange={(event) => setQuery(event.currentTarget.value)} />
    <div className={styles.listScroll}>
      {visible.map((item) => <div key={item.id} className={styles.item} data-active={item.id === current?.id || undefined}>
        <Link href={{ pathname: "/panel/ai-writer/[id]", params: { id: item.id } }} className={styles.itemLink} onClick={() => setDrawer(false)}
          aria-current={item.id === current?.id ? "page" : undefined}>
          <span className={styles.itemTitle}>{item.title || t("untitled")}</span>
          <span className={styles.itemMeta}>{item.newsId && <Link2 size={11} aria-label={t("list.linked")} />}{format.relative(item.lastMessageAt ?? item.createdAt)}</span>
        </Link>
        <RowMenu label={t("list.actions", { title: item.title || t("untitled") })} actions={[
          { label: t("list.rename"), icon: Pencil, onClick: () => setRenaming(item) },
          { label: common("delete"), icon: Trash2, tone: "danger", onClick: () => remove(item) },
        ]} />
      </div>)}
      {!visible.length && <Text size="sm" c="dimmed" p="xs">{query ? t("list.noResults") : t("list.empty")}</Text>}
    </div>
  </nav>;

  const statusNotice = !status.available
    ? <Notice tone="warning" title={t("status.unavailable")} icon={CircleAlert}>
      {codes[status.code ?? "ai_unconfigured"] ?? codes.ai_unconfigured}{" "}
      {canConfigure && <Link href="/panel/settings/ai">{t("status.configure")}</Link>}
    </Notice>
    : !status.generative
      ? <Notice tone="info" icon={Wand2}>{t("status.local")}{" "}{canConfigure && <Link href="/panel/settings/ai">{t("status.configure")}</Link>}</Notice>
      : !status.images && options.image ? <Notice tone="neutral">{t("status.noImages")}</Notice> : null;

  const proposalOf = (message: WriterMessage) => message.proposal && <ProposalCard key={`${message.id}-${message.mediaIds.length}`} messageId={message.id}
    proposal={message.proposal} media={message.mediaIds.map((id) => media.get(id)).filter((item): item is WriterMedia => !!item)} sections={sections}
    linkedNewsId={current?.newsId ?? null} canWrite={canWrite} canIllustrate={canIllustrate && status.images}
    onIllustrated={(item) => { addMedia(item); setMessages((list) => list.map((entry) => entry.id === message.id ? { ...entry, mediaIds: [...entry.mediaIds, item.id] } : entry)); }}
    onApplied={(newsId) => setMessages((list) => list.map((entry) => entry.id === message.id && entry.proposal ? { ...entry, proposal: { ...entry.proposal, newsId } } : entry))} />;

  return <div className={styles.workspace}>
    <aside className={styles.sidebar}>{list}</aside>
    <section className={styles.main}>
      <header className={styles.topbar}>
        <ActionIcon className={styles.compactOnly} variant="subtle" color="gray" aria-label={t("list.label")} onClick={() => setDrawer(true)}><Menu size={18} aria-hidden="true" /></ActionIcon>
        <div className={styles.topbarTitle}>
          <Title order={1}>{current?.title || t("newConversation")}</Title>
          {linked && <Tooltip label={t("openLinked")}>
            <Link href={{ pathname: "/panel/news/[id]", params: { id: linked } }}><StatusBadge tone="brand">{t("linkedNews")}</StatusBadge></Link>
          </Tooltip>}
        </div>
      </header>

      <div className={styles.scroll} ref={scroller} onScroll={onScroll}>
        <div className={styles.thread}>
          {statusNotice}
          {!messages.length && !live && <div className={styles.hero}>
            <div className={styles.orb}><Sparkles size={26} aria-hidden="true" /></div>
            <div>
              <Title order={2}>{t("hero.title")}</Title>
              <Text c="dimmed" mt={6} maw={640}>{t("hero.intro")}</Text>
            </div>
            <Text fw={600} size="sm">{t("hero.tipsTitle")}</Text>
            <ul className={styles.tips}>
              {(t.raw("hero.tips") as string[]).map((tip) => <li key={tip} className={styles.tip}><Check size={15} aria-hidden="true" />{tip}</li>)}
            </ul>
            <Text fw={600} size="sm">{t("hero.examples")}</Text>
            <div className={styles.samples}>
              {(t.raw("hero.samples") as string[]).map((sample) => <button key={sample} type="button" className={styles.sample} disabled={disabled || running}
                onClick={() => setBrief(sample)}><Lightbulb size={16} aria-hidden="true" />{sample}</button>)}
            </div>
          </div>}

          {messages.map((message) => message.role === "user"
            ? <div key={message.id} className={styles.brief} aria-label={t("you")}>{message.content}</div>
            : <article key={message.id} className={styles.answer} aria-label={t("assistant")}>
              <div className={styles.avatar}><Sparkles size={16} aria-hidden="true" /></div>
              <div className={styles.answerBody}>
                {message.proposal ? <>
                  {proposalOf(message)}
                  {message.content && <div>
                    <Button size="compact-xs" variant="subtle" color="gray" onClick={() => setShown((set) => {
                      const next = new Set(set);
                      if (next.has(message.id)) next.delete(message.id); else next.add(message.id);
                      return next;
                    })}>{shown.has(message.id) ? t("proposal.hideArticle") : t("proposal.showArticle")}</Button>
                    {shown.has(message.id) && <div className={styles.written}><ArticleMarkdown text={message.content} /></div>}
                  </div>}
                </> : message.content && <ArticleMarkdown text={message.content} />}
                {message.status === "stopped" && <div><StatusBadge tone="warning">{t("stopped")}</StatusBadge></div>}
                {message.errorCode && <div className={styles.error} role="alert"><CircleAlert size={16} aria-hidden="true" />{codes[message.errorCode] ?? codes.failed}</div>}
              </div>
            </article>)}

          {live && <article className={styles.answer} aria-live="polite" aria-busy="true" aria-label={t("assistant")}>
            <div className={styles.avatar} data-active><Sparkles size={16} aria-hidden="true" /></div>
            <div className={styles.answerBody}>
              <ol className={styles.stages} aria-label={t("stages.label")}>
                {STAGES.filter(({ stage }) => stage !== "illustrating" || options.image).map(({ stage, icon: Icon }, index, shownStages) => {
                  const position = shownStages.findIndex((entry) => entry.stage === live.stage);
                  const state = index < position ? "done" : index === position ? "active" : "pending";
                  return <li key={stage} className={styles.stage} data-state={state}>
                    {state === "done" ? <Check size={12} aria-hidden="true" /> : <Icon size={12} aria-hidden="true" />}{t(`stages.${stage}`)}
                  </li>;
                })}
              </ol>
              {live.text ? <ArticleMarkdown text={live.text} streaming={live.stage === "writing"} />
                : <span className={styles.dots} aria-hidden="true"><span /><span /><span /></span>}
            </div>
          </article>}

          {failure && <Notice tone="danger" title={codes.failed} icon={CircleAlert}>{failure}</Notice>}
        </div>
      </div>

      {!near && <ActionIcon className={styles.jump} variant="default" radius="xl" size="lg" aria-label={t("toBottom")}
        onClick={() => scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" })}><ArrowDown size={18} aria-hidden="true" /></ActionIcon>}

      <div className={styles.composerArea}>
        <div className={styles.composerInner}>
          <div className={styles.composer}>
            <textarea className={styles.composerText} aria-label={t("composer.label")} placeholder={t("composer.placeholder")} value={brief} maxLength={BRIEF_MAX}
              disabled={disabled} rows={3} onChange={(event) => setBrief(event.currentTarget.value)}
              onKeyDown={(event) => { if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) { event.preventDefault(); void send(); } }} />
            <div className={styles.composerBar} role="group" aria-label={t("options.label")}>
              <SegmentedControl size="xs" value={options.language} aria-label={t("options.language")} disabled={running}
                data={WRITER_LANGUAGES.map((value) => ({ value, label: value.toUpperCase() }))}
                onChange={(value) => setOptions((current) => ({ ...current, language: value === "en" ? "en" : "pt" }))} />
              <Select size="xs" w={190} allowDeselect={false} aria-label={t("options.tone")} value={options.tone} disabled={running}
                data={WRITER_TONES.map((value) => ({ value, label: t(`options.tones.${value}`) }))}
                onChange={(value) => value && setOptions((current) => ({ ...current, tone: value as WriterOptions["tone"] }))} />
              <Select size="xs" w={190} allowDeselect={false} aria-label={t("options.length")} value={options.length} disabled={running}
                data={WRITER_LENGTHS.map((value) => ({ value, label: t(`options.lengths.${value}`) }))}
                onChange={(value) => value && setOptions((current) => ({ ...current, length: value as WriterOptions["length"] }))} />
              {editorialStyles.length > 0 && <Select size="xs" w={230} allowDeselect={false} aria-label={t("options.style")} title={t("options.styleHelp")}
                value={chosenStyle(editorialStyles, options.styleId)} disabled={running} leftSection={<PenTool size={13} aria-hidden="true" />}
                data={[
                  ...editorialStyles.map((style) => ({ value: style.id, label: style.isDefault ? t("options.defaultStyle", { name: style.name }) : style.name })),
                  { value: NO_STYLE, label: t("options.noStyle") },
                ]}
                onChange={(value) => value && setOptions((current) => ({ ...current, styleId: value }))} />}
              <Switch size="xs" label={t("options.image")} checked={options.image} disabled={running}
                onChange={(event) => { const image = event.currentTarget.checked; setOptions((current) => ({ ...current, image })); }} />
              {brief.length > BRIEF_MAX * 0.8 && <Text size="xs" c="dimmed">{t("composer.count", { count: brief.length, max: BRIEF_MAX })}</Text>}
              {running
                ? <ActionIcon className={styles.send} data-running size={36} radius="xl" aria-label={t("composer.stop")} onClick={stop}><Square size={14} fill="currentColor" aria-hidden="true" /></ActionIcon>
                : <ActionIcon className={styles.send} size={36} radius="xl" aria-label={t("composer.send")} disabled={!brief.trim() || disabled} onClick={() => void send()}><ArrowUp size={18} aria-hidden="true" /></ActionIcon>}
            </div>
          </div>
          <p className={styles.hint}>{t("composer.hint")}</p>
        </div>
      </div>
    </section>

    <Drawer opened={drawer} onClose={() => setDrawer(false)} title={t("list.label")} size="85%" padding={0}>{list}</Drawer>
    {confirmation.dialog}
    {renaming && <FormModal opened onClose={() => setRenaming(null)} title={t("list.rename")} size="md" initial={{ title: renaming.title }}
      fields={[{ name: "title", type: "text", label: t("list.title"), required: true, maxLength: 160 }]} success={t("list.renamed")}
      onSubmit={async (values) => { const result = await renameConversation(renaming.id, values); if (result.ok) applyConversation(result.data); return result; }}
      onSuccess={() => setRenaming(null)} />}
  </div>;
}

