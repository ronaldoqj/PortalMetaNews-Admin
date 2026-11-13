"use client";

import { RichTextEditor } from "@mantine/tiptap";
import Image from "@tiptap/extension-image";
import { CharacterCount, Placeholder } from "@tiptap/extensions";
import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { ImagePlus } from "lucide-react";
import { useEffect, useRef } from "react";
import styles from "./article-editor.module.css";

/** The words of the toolbar, in the interface's language (the caller's catalog). */
export type ArticleEditorLabels = {
  toolbar: string; bold: string; italic: string; underline: string; strike: string; h2: string; h3: string; bulletList: string; orderedList: string;
  blockquote: string; hr: string; link: string; unlink: string; undo: string; redo: string; clear: string; image: string;
};

/** An image of the media library, inserted as `<img src="/media/<id>/lg" alt="...">`. */
export type ArticleImage = { id: string; alt: string };

/**
 * The editor of an article body. It writes exactly the article grammar (`components/forms/article-html.ts`):
 * paragraphs, subheadings (H2, H3), bold, italic, underline, strike-through, lists, quotes, separators, links and
 * images of the media library; code, other heading levels and pasted styles never enter the document. `pickImage`
 * opens the caller's media picker and gives back the chosen image.
 */
export function ArticleEditor({ value, onChange, onBlur, labels, placeholder = "", pickImage, disabled = false, lang, minHeight = 320 }: {
  value: string; onChange: (html: string) => void; onBlur?: () => void; labels: ArticleEditorLabels; placeholder?: string;
  pickImage?: () => Promise<ArticleImage | null>; disabled?: boolean; lang?: string; minHeight?: number;
}) {
  const emitted = useRef(value);
  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    editable: !disabled,
    content: value,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] }, code: false, codeBlock: false,
        link: { openOnClick: false, autolink: true, protocols: ["http", "https", "mailto"], defaultProtocol: "https",
          isAllowedUri: (url) => /^(?:https?:\/\/|mailto:)/i.test(url) },
      }),
      Image.configure({ inline: false, allowBase64: false }),
      Placeholder.configure({ placeholder }),
      CharacterCount,
    ],
    editorProps: {
      attributes: { ...(lang ? { lang } : {}), class: "article-body article-editor-content" },
      // Pasted content keeps its text and structure, never its images (only the media library's may enter).
      transformPastedHTML: (html) => html.replace(/<img[^>]*>/gi, ""),
    },
  });

  useEffect(() => {
    if (!editor) return;
    const update = () => {
      const html = editor.isEmpty ? "" : editor.getHTML();
      emitted.current = html;
      onChange(html);
    };
    const blur = () => onBlur?.();
    editor.on("update", update);
    editor.on("blur", blur);
    return () => { editor.off("update", update); editor.off("blur", blur); };
  }, [editor, onChange, onBlur]);
  // A value set from outside (a translation, a restored revision) replaces the document without echoing back.
  useEffect(() => {
    if (!editor || value === emitted.current) return;
    emitted.current = value;
    editor.commands.setContent(value, { emitUpdate: false });
  }, [editor, value]);
  useEffect(() => { editor?.setEditable(!disabled); }, [editor, disabled]);

  const controls = { disabled: disabled || !editor };
  const insertImage = async () => {
    if (!editor || !pickImage) return;
    const image = await pickImage();
    if (image) editor.chain().focus().setImage({ src: `/media/${image.id}/lg`, alt: image.alt }).run();
  };
  return <RichTextEditor editor={editor} classNames={{ root: styles.root, content: styles.content }} style={{ "--article-editor-min-height": `${minHeight}px` } as React.CSSProperties}
    labels={{
      boldControlLabel: labels.bold, italicControlLabel: labels.italic, underlineControlLabel: labels.underline, strikeControlLabel: labels.strike,
      h2ControlLabel: labels.h2, h3ControlLabel: labels.h3, bulletListControlLabel: labels.bulletList, orderedListControlLabel: labels.orderedList,
      blockquoteControlLabel: labels.blockquote, hrControlLabel: labels.hr, linkControlLabel: labels.link, unlinkControlLabel: labels.unlink,
      undoControlLabel: labels.undo, redoControlLabel: labels.redo, clearFormattingControlLabel: labels.clear,
    }}>
    <RichTextEditor.Toolbar sticky stickyOffset={68} aria-label={labels.toolbar}>
      <RichTextEditor.ControlsGroup>
        <RichTextEditor.Bold {...controls} /><RichTextEditor.Italic {...controls} /><RichTextEditor.Underline {...controls} /><RichTextEditor.Strikethrough {...controls} />
      </RichTextEditor.ControlsGroup>
      <RichTextEditor.ControlsGroup>
        <RichTextEditor.H2 {...controls} /><RichTextEditor.H3 {...controls} />
      </RichTextEditor.ControlsGroup>
      <RichTextEditor.ControlsGroup>
        <RichTextEditor.BulletList {...controls} /><RichTextEditor.OrderedList {...controls} /><RichTextEditor.Blockquote {...controls} /><RichTextEditor.Hr {...controls} />
      </RichTextEditor.ControlsGroup>
      <RichTextEditor.ControlsGroup>
        <RichTextEditor.Link {...controls} /><RichTextEditor.Unlink {...controls} />
        {pickImage && <RichTextEditor.Control onClick={() => void insertImage()} aria-label={labels.image} title={labels.image} disabled={controls.disabled}>
          <ImagePlus size={16} strokeWidth={1.6} aria-hidden="true" />
        </RichTextEditor.Control>}
      </RichTextEditor.ControlsGroup>
      <RichTextEditor.ControlsGroup>
        <RichTextEditor.ClearFormatting {...controls} /><RichTextEditor.Undo {...controls} /><RichTextEditor.Redo {...controls} />
      </RichTextEditor.ControlsGroup>
    </RichTextEditor.Toolbar>
    <RichTextEditor.Content />
  </RichTextEditor>;
}
