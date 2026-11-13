"use client";

import { useEffect, useState, type MouseEvent } from "react";
import { easeScrollTo } from "../shared/ease-scroll";
import type { Heading } from "./markdown";
import styles from "./documentation.module.css";

/** Above this many entries, the outline keeps only the main sections. */
const FULL_OUTLINE_LIMIT = 40;

/**
 * The document's outline: on wide screens it stays beside the text and follows the reading. Its entries glide to
 * their heading with an ease-in-out curve and leave its address in the bar, as a plain anchor would.
 */
export function DocumentToc({ headings, label }: { headings: Heading[]; label: string }) {
  const entries = headings.length > FULL_OUTLINE_LIMIT ? headings.filter((heading) => heading.level === 2) : headings;
  const [active, setActive] = useState(entries[0]?.id);
  useEffect(() => {
    const targets = entries.map((entry) => document.getElementById(entry.id)).filter((target) => target !== null);
    if (!targets.length) return;
    const update = () => {
      // The last heading already past the top of the reading area.
      const current = targets.findLast((target) => target.getBoundingClientRect().top <= 120) ?? targets[0];
      setActive(current.id);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, [entries.length]); // eslint-disable-line react-hooks/exhaustive-deps -- the headings of a page do not change while it is open.
  if (entries.length < 2) return null;
  const go = (id: string) => (event: MouseEvent<HTMLAnchorElement>) => {
    const target = document.getElementById(id);
    if (!target || event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    event.preventDefault();
    history.replaceState(history.state, "", `#${id}`);
    easeScrollTo(target, 96);
  };
  return <nav aria-label={label} className={styles.toc}>
    <div className={styles.tocTitle}>{label}</div>
    <ul>
      {entries.map((entry) => <li key={entry.id} data-level={entry.level}>
        <a href={`#${entry.id}`} onClick={go(entry.id)} data-active={active === entry.id || undefined} aria-current={active === entry.id ? "location" : undefined}>{entry.text}</a>
      </li>)}
    </ul>
  </nav>;
}
