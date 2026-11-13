"use client";

import { toJsxRuntime } from "hast-util-to-jsx-runtime";
import { Fragment, useMemo, type ComponentProps } from "react";
import { jsx, jsxs } from "react/jsx-runtime";
import { markdownTree } from "./writer-markdown";
import styles from "./writer.module.css";

/** The article as the AI writes it, from Markdown to React elements (never injected HTML); images are not drawn. */
export function ArticleMarkdown({ text, streaming = false }: { text: string; streaming?: boolean }) {
  const tree = useMemo(() => markdownTree(text), [text]);
  const content = toJsxRuntime(tree, {
    Fragment, jsx, jsxs,
    components: {
      a: ({ href, children }: ComponentProps<"a">) => href && /^https?:\/\//i.test(href)
        ? <a href={href} target="_blank" rel="noopener noreferrer nofollow">{children}</a> : <>{children}</>,
      img: () => null,
    },
  });
  return <div className={styles.markdown} data-streaming={streaming || undefined}>{content}</div>;
}
