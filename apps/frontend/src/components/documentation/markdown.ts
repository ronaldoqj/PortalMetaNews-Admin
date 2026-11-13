import GithubSlugger from "github-slugger";
import type { Element, Root, RootContent } from "hast";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";

export type Heading = { id: string; text: string; level: 2 | 3 };
export const ALERTS = { NOTE: "note", TIP: "tip", IMPORTANT: "important", WARNING: "warning", CAUTION: "caution" } as const;
export type AlertKind = (typeof ALERTS)[keyof typeof ALERTS];

/** Raw HTML in the source is dropped by `remark-rehype`, so only Markdown's own elements reach the page. */
const processor = unified().use(remarkParse).use(remarkGfm).use(remarkRehype)
  .use(rehypeHighlight, { aliases: { ini: ["dotenv", "env"], bash: ["console"] } });

export function textOf(node: Root | RootContent): string {
  if (node.type === "text") return node.value;
  return "children" in node ? node.children.map(textOf).join("") : "";
}

/** Marks a GitHub alert (`> [!NOTE]`) with its kind and takes the marker out of the text. */
function markAlert(quote: Element) {
  const paragraph = quote.children.find((child): child is Element => child.type === "element");
  const first = paragraph?.children[0];
  if (paragraph?.tagName !== "p" || first?.type !== "text") return;
  const marker = /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*/.exec(first.value);
  if (!marker) return;
  quote.properties.dataAlert = ALERTS[marker[1] as keyof typeof ALERTS];
  first.value = first.value.slice(marker[0].length);
}

/** Leaves on a code block what its copy button and label need, as the page never reads the tree again. */
function markCode(block: Element) {
  const code = block.children.find((child): child is Element => child.type === "element" && child.tagName === "code");
  const classes = code?.properties.className;
  const language = (Array.isArray(classes) ? classes : []).map(String).find((name) => name.startsWith("language-"));
  block.properties.dataCode = textOf(block).replace(/\n$/, "");
  if (language) block.properties.dataLanguage = language.slice("language-".length);
}

/**
 * Parses a document into a tree the page renders as React elements, and its outline. Headings take the ids GitHub
 * gives them, so links written for the repository keep working; the opening title is left out, as the page has its own.
 */
export function parseMarkdown(source: string, options: { slugger?: GithubSlugger; keepOpeningTitle?: boolean } = {}): { tree: Root; headings: Heading[] } {
  const tree = processor.runSync(processor.parse(source)) as Root;
  // Several texts on one page (a tutorial's blocks) share a slugger, so their headings never take the same id.
  const slugger = options.slugger ?? new GithubSlugger();
  const headings: Heading[] = [];
  let openingTitle = !options.keepOpeningTitle;
  const visit = (parent: Root | Element, depth: number) => {
    parent.children = parent.children.filter((node) => {
      if (node.type !== "element") return true;
      if (depth === 0 && openingTitle && node.tagName === "h1") { openingTitle = false; return false; }
      if (/^h[1-6]$/.test(node.tagName)) {
        openingTitle = false;
        const text = textOf(node);
        const id = slugger.slug(text);
        node.properties.id = id;
        if (node.tagName === "h2" || node.tagName === "h3") headings.push({ id, text, level: node.tagName === "h2" ? 2 : 3 });
      } else if (node.tagName === "blockquote") {
        markAlert(node);
      } else if (node.tagName === "pre") {
        markCode(node);
      }
      visit(node, depth + 1);
      return true;
    });
  };
  visit(tree, 0);
  return { tree, headings };
}

/** Where a link written in `source` points: a place in the document, a page outside, another repository file or nowhere usable. */
export function resolveLink(href: string, source: string): { kind: "anchor" | "external"; href: string } | { kind: "file"; path: string; hash?: string } | { kind: "none" } {
  if (href.startsWith("#")) return { kind: "anchor", href };
  if (/^(https?:|mailto:)/i.test(href)) return { kind: "external", href };
  if (/^[a-z][a-z0-9+.-]*:|^\/\//i.test(href)) return { kind: "none" };
  const [target, hash] = href.split("#", 2);
  const segments: string[] = target.startsWith("/") ? [] : source.split("/").slice(0, -1);
  for (const segment of decodeURI(target).split("/")) {
    if (segment === "..") { if (!segments.length) return { kind: "none" }; segments.pop(); }
    else if (segment && segment !== ".") segments.push(segment);
  }
  return { kind: "file", path: segments.join("/"), hash };
}
