import type { Root } from "hast";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";

export type SseEvent = { event: string; data: string };

/** Splits what a server-sent event stream delivered so far into its whole events and the unfinished rest. */
export function parseSse(buffer: string): { events: SseEvent[]; rest: string } {
  const blocks = buffer.replace(/\r\n?/g, "\n").split("\n\n");
  const rest = blocks.pop() ?? "";
  const events: SseEvent[] = [];
  for (const block of blocks) {
    let event = "message";
    const data: string[] = [];
    for (const line of block.split("\n")) {
      if (!line || line.startsWith(":")) continue;
      const colon = line.indexOf(":");
      const field = colon < 0 ? line : line.slice(0, colon);
      const value = colon < 0 ? "" : line.slice(colon + 1).replace(/^ /, "");
      if (field === "event") event = value;
      else if (field === "data") data.push(value);
    }
    if (data.length) events.push({ event, data: data.join("\n") });
  }
  return { events, rest };
}

/** Raw HTML in the article is dropped by `remark-rehype`, so only Markdown's own elements reach the page. */
const processor = unified().use(remarkParse).use(remarkGfm).use(remarkRehype);

/** The article as it is written (Markdown), as a tree of elements to render as React, never as injected markup. */
export function markdownTree(markdown: string): Root {
  return processor.runSync(processor.parse(markdown)) as Root;
}
