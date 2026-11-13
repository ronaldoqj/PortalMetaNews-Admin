"use client";

import { SegmentedControl, Stack, Text, Textarea, TextInput } from "@mantine/core";
import { useTranslations } from "next-intl";
import { createContext, useContext, useState, type ReactNode } from "react";
import { CONTENT_LOCALES, type ContentLocale, type I18nString } from "@/i18n/i18n-string";

type Scope = { editing: ContentLocale; setEditing: (locale: ContentLocale) => void; disabled?: boolean };
const ContentLanguageContext = createContext<Scope>({ editing: "pt", setEditing: () => undefined });

/** The language being edited inside the nearest {@link ContentLanguageScope}. */
export function useEditingLanguage(): ContentLocale {
  return useContext(ContentLanguageContext).editing;
}

/**
 * Groups the bilingual fields of a form under one `PT | EN` switch: every {@link I18nTextInput} inside it edits the
 * language selected there. The switch opens the scope unless `placeSwitch` is false (a {@link ContentLanguageSwitch}
 * then goes where it belongs).
 */
export function ContentLanguageScope({ children, disabled, placeSwitch = true, initial = "pt" }: {
  children: ReactNode; disabled?: boolean; placeSwitch?: boolean; initial?: ContentLocale;
}) {
  const [editing, setEditing] = useState<ContentLocale>(initial);
  return <ContentLanguageContext.Provider value={{ editing, setEditing, disabled }}>
    {placeSwitch && <ContentLanguageSwitch />}
    {children}
  </ContentLanguageContext.Provider>;
}

/** The `PT | EN` switch of the enclosing {@link ContentLanguageScope}. */
export function ContentLanguageSwitch() {
  const translate = useTranslations("I18nText");
  const { editing, setEditing, disabled } = useContext(ContentLanguageContext);
  return <Stack gap={4}>
    <SegmentedControl size="xs" disabled={disabled} aria-label={translate("language")} value={editing} style={{ alignSelf: "flex-start" }}
      data={CONTENT_LOCALES.map((value) => ({ value, label: translate(`languages.${value}`) }))}
      onChange={(value) => setEditing(value === "en" ? "en" : "pt")} />
    <Text size="xs" c="dimmed">{translate("help")}</Text>
  </Stack>;
}

/**
 * Edits one localized text in the language selected by the enclosing scope. The other language's text shows as the
 * placeholder, which is what the site falls back to while this one is blank.
 */
export function I18nTextInput({ label, description, value, onChange, required = false, maxLength, multiline = false, disabled }: {
  label: string; description?: string; value: I18nString; onChange: (value: I18nString) => void;
  required?: boolean; maxLength: number; multiline?: boolean; disabled?: boolean;
}) {
  const { editing } = useContext(ContentLanguageContext);
  const other = CONTENT_LOCALES.find((locale) => locale !== editing)!;
  const props = {
    label: `${label} (${editing.toUpperCase()})`, description, placeholder: value[other] || undefined,
    // At least one language is required; the other falls back to it.
    required: required && !value[other]?.trim(), maxLength, disabled, lang: editing, value: value[editing] ?? "",
    onChange: (event: { currentTarget: { value: string } }) => onChange({ ...value, [editing]: event.currentTarget.value }),
  };
  return multiline ? <Textarea {...props} autosize minRows={2} /> : <TextInput {...props} />;
}
