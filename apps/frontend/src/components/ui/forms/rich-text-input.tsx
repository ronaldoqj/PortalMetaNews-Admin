"use client";

import { InputBase, type InputBaseProps } from "@mantine/core";
import { RichTextEditor } from "@mantine/tiptap";
import { CharacterCount, Placeholder } from "@tiptap/extensions";
import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState, type CSSProperties } from "react";

export type RichTextInputProps = Pick<InputBaseProps, "label" | "description" | "error" | "required" | "variant" | "radius" | "size"> & {
  /** HTML as the editor writes it; `""` while the editor holds no text. */
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  /** Fewest readable characters accepted, markup aside. */
  minLength?: number;
  /** Most readable characters the editor takes. */
  maxLength?: number;
  /** Height of the empty editor, in lines. */
  minRows?: number;
};

/**
 * Formatted long text: bold, italic, underline and lists, nothing else (no headings, links, code or
 * quotes, typed or pasted). It is a Mantine input whose field holds the editor, so it takes the
 * identity's field variant, radius and density like every other input; the toolbar and its active
 * states draw from the same tokens. A hidden proxy keeps the browser's form validation: the form is not
 * submitted while a required editor is empty or shorter than `minLength`.
 */
export function RichTextInput({
  value, onChange, placeholder = "", disabled = false, required = false, minLength, maxLength = 20_000, minRows = 4, error, label,
  description, ...style
}: RichTextInputProps) {
  const translate = useTranslations("RichText");
  const id = useId();
  const [invalid, setInvalid] = useState<string>();
  const emitted = useRef(value);
  const describedBy = [(error || invalid) && `${id}-error`, description && `${id}-description`].filter(Boolean).join(" ");
  const editor = useEditor({
    // Rendered on the client only, so the server markup never disagrees with the editor's.
    immediatelyRender: false,
    // The toolbar reads its active states while rendering.
    shouldRerenderOnTransaction: true,
    editable: !disabled,
    content: value,
    extensions: [
      StarterKit.configure({ heading: false, blockquote: false, code: false, codeBlock: false, horizontalRule: false, strike: false, link: false }),
      Placeholder.configure({ placeholder }),
      CharacterCount.configure({ limit: maxLength }),
    ],
  });

  useEffect(() => {
    if (!editor) return;
    const update = () => {
      const html = editor.isEmpty ? "" : editor.getHTML();
      emitted.current = html;
      setInvalid(undefined);
      onChange(html);
    };
    editor.on("update", update);
    return () => { editor.off("update", update); };
  }, [editor, onChange]);
  // A value set from outside (a reset, another language) replaces the document without echoing back.
  useEffect(() => {
    if (!editor || value === emitted.current) return;
    emitted.current = value;
    editor.commands.setContent(value, { emitUpdate: false });
  }, [editor, value]);
  useEffect(() => { editor?.setEditable(!disabled); }, [editor, disabled]);
  // The editable area carries the field's accessible name, description and state; the placeholder follows the language.
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    const placeholderExtension = editor.extensionManager.extensions.find((extension) => extension.name === "placeholder");
    if (placeholderExtension) placeholderExtension.options.placeholder = placeholder;
    editor.setOptions({ editorProps: { attributes: {
      role: "textbox", "aria-multiline": "true", "aria-labelledby": `${id}-label`,
      ...(describedBy ? { "aria-describedby": describedBy } : {}),
      ...(required ? { "aria-required": "true" } : {}),
      ...(error || invalid ? { "aria-invalid": "true" } : {}),
    } } });
  }, [editor, placeholder, id, describedBy, required, error, invalid]);

  const text = editor ? editor.getText({ blockSeparator: "\n" }).trim() : "";
  const tooShort = minLength !== undefined && text.length > 0 && text.length < minLength;
  const proxy = useRef<HTMLInputElement>(null);
  useEffect(() => { proxy.current?.setCustomValidity(tooShort ? translate("tooShort", { min: minLength ?? 0 }) : ""); });

  const controls = { disabled: disabled || !editor };
  return <InputBase component="div" multiline id={id} label={label} description={description} required={required} disabled={disabled}
    error={error ?? invalid} classNames={{ input: "rich-text-input" }} {...style}
    labelProps={{ onClick: () => editor?.commands.focus() }}
    style={{ "--rich-text-rows": minRows } as CSSProperties}>
    <RichTextEditor editor={editor} variant="subtle" classNames={{
        root: "rich-text-input-root", toolbar: "rich-text-input-toolbar", controlsGroup: "rich-text-input-group", content: "rich-text-input-content",
      }}
      labels={{
        boldControlLabel: translate("bold"), italicControlLabel: translate("italic"), underlineControlLabel: translate("underline"),
        bulletListControlLabel: translate("bulletList"), orderedListControlLabel: translate("orderedList"),
        clearFormattingControlLabel: translate("clearFormatting"),
      }}>
      <RichTextEditor.Toolbar aria-label={translate("toolbar")}>
        <RichTextEditor.ControlsGroup>
          <RichTextEditor.Bold {...controls} />
          <RichTextEditor.Italic {...controls} />
          <RichTextEditor.Underline {...controls} />
        </RichTextEditor.ControlsGroup>
        <RichTextEditor.ControlsGroup>
          <RichTextEditor.BulletList {...controls} />
          <RichTextEditor.OrderedList {...controls} />
        </RichTextEditor.ControlsGroup>
        <RichTextEditor.ControlsGroup>
          <RichTextEditor.ClearFormatting {...controls} />
        </RichTextEditor.ControlsGroup>
      </RichTextEditor.Toolbar>
      <RichTextEditor.Content />
    </RichTextEditor>
    {/* Not submitted (no name): it only lets the browser block the form, and hands the error to the editor. */}
    <input ref={proxy} className="rich-text-input-proxy" tabIndex={-1} aria-hidden="true" required={required} value={text}
      onChange={() => undefined}
      onInvalid={(event) => {
        event.preventDefault();
        setInvalid(event.currentTarget.validity.valueMissing ? translate("required") : event.currentTarget.validationMessage);
        editor?.commands.focus();
      }} />
  </InputBase>;
}
