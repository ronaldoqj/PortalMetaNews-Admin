"use client";

import { SimpleGrid, Stack, Text } from "@mantine/core";
import { ArrowRight, BookOpen, Clock, FileText, Layers, Search, SearchX } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { Link } from "../../i18n/navigation";
import { GradientHero, HeroStat, HeroStats } from "../shared/gradient-hero";
import { TextInput } from "../ui/forms/input";
import { Title } from "../ui/title";
import type { DocumentationEntry, DocumentationGroup } from "./catalog";
import styles from "./documentation.module.css";

const normalized = (value: string) => value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
const minutes = (words: number) => Math.max(1, Math.ceil(words / 200));

function DocumentCard({ entry }: { entry: DocumentationEntry }) {
  const translate = useTranslations("Documentation");
  return <Link href={{ pathname: "/panel/documentation/[id]", params: { id: entry.slug } }} className={styles.card}>
    <span className={styles.cardIcon}><FileText size={18} aria-hidden="true" /></span>
    <span className={styles.cardTitle}>{entry.title}</span>
    <span className={styles.cardSummary}>{entry.summary}</span>
    <span className={styles.cardFooter}>
      <code>{entry.source}</code>
      <span className={styles.cardTime}><Clock size={12} aria-hidden="true" />{translate("readingTime", { minutes: minutes(entry.words) })}</span>
    </span>
    <ArrowRight size={16} className={styles.cardArrow} aria-hidden="true" />
  </Link>;
}

/** The documentation's front page: the documents by group, narrowed as the visitor types. Nothing typed leaves the browser. */
export function DocumentationIndex({ groups }: { groups: DocumentationGroup[] }) {
  const translate = useTranslations("Documentation");
  const [query, setQuery] = useState("");
  const all = groups.flatMap((group) => group.documents);
  const visible = useMemo(() => {
    const terms = normalized(query).split(/\s+/).filter(Boolean);
    // A group keeps its number while the search hides the others.
    return groups.map((group, index) => ({
      ...group,
      number: index + 1,
      documents: group.documents.filter((entry) => {
        const text = normalized(`${entry.title} ${entry.summary} ${entry.source} ${group.title}`);
        return terms.every((term) => text.includes(term));
      }),
    })).filter((group) => group.documents.length);
  }, [groups, query]);
  const hours = Math.max(1, Math.round(all.reduce((total, entry) => total + minutes(entry.words), 0) / 60));
  return <Stack gap={40}>
    <GradientHero title={translate("title")} description={translate("description")}>
      <HeroStats>
        <HeroStat icon={<FileText size={16} aria-hidden="true" />} value={all.length} label={translate("statDocuments", { count: all.length })} />
        <HeroStat icon={<Layers size={16} aria-hidden="true" />} value={groups.length} label={translate("statGroups", { count: groups.length })} />
        <HeroStat icon={<BookOpen size={16} aria-hidden="true" />} value={hours} label={translate("statHours", { count: hours })} />
      </HeroStats>
      <TextInput className={styles.search} size="md" value={query} onChange={(event) => setQuery(event.currentTarget.value)} leftSection={<Search size={18} aria-hidden="true" />}
        aria-label={translate("searchLabel")} placeholder={translate("searchPlaceholder")} />
    </GradientHero>
    {visible.map((group) => <section key={group.title} aria-labelledby={`group-${group.number}`} className={styles.group}>
      <div className={styles.groupHeader}>
        <span className={styles.groupNumber} aria-hidden="true">{String(group.number).padStart(2, "0")}</span>
        <div>
          <Title order={2} size="h3" id={`group-${group.number}`}>{group.title}</Title>
          {group.description && <Text size="sm" c="dimmed">{group.description}</Text>}
        </div>
      </div>
      <SimpleGrid cols={{ base: 1, sm: 2, xl: 3 }} spacing="md">
        {group.documents.map((entry) => <DocumentCard key={entry.slug} entry={entry} />)}
      </SimpleGrid>
    </section>)}
    {visible.length === 0 && <div className={styles.empty} role="status">
      <SearchX size={28} aria-hidden="true" />
      <Text fw={600}>{translate("noResults")}</Text>
      <Text size="sm" c="dimmed">{translate("noResultsHint")}</Text>
    </div>}
    <Text size="xs" c="dimmed" ta="center">{translate("languageNote")}</Text>
  </Stack>;
}
