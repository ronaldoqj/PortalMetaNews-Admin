import { Fragment, type ReactNode } from "react";
import { parseRichText, type RichBlock, type RichInline } from "../forms/rich-text";

function inline(node: RichInline, key: number): ReactNode {
  switch (node.kind) {
    case "text": return <Fragment key={key}>{node.text}</Fragment>;
    case "br": return <br key={key} />;
    case "strong": return <strong key={key}>{node.children.map(inline)}</strong>;
    case "em": return <em key={key}>{node.children.map(inline)}</em>;
    case "u": return <u key={key}>{node.children.map(inline)}</u>;
  }
}

function blocks(nodes: RichBlock[]): ReactNode[] {
  return nodes.map((block, key) => {
    if (block.kind === "p") return <p key={key}>{block.children.map(inline)}</p>;
    const List = block.kind;
    return <List key={key}>{block.items.map((item, index) => <li key={index}>{blocks(item)}</li>)}</List>;
  });
}

/**
 * A rich-text answer, read through the same grammar the API enforces and rendered as React elements, so
 * no stored markup ever reaches the page as HTML. Text outside that grammar is shown as plain text.
 */
export function RichTextContent({ value }: { value: string }) {
  const document = parseRichText(value);
  return <div className="rich-text-content">
    {document ? blocks(document) : <p style={{ whiteSpace: "pre-wrap" }}>{value}</p>}
  </div>;
}
