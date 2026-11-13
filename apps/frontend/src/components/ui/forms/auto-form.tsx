"use client";

import { Alert, ColorSwatch, Group, Input, Stack } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { Check, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import type { z } from "zod";
import type { I18nString } from "../../../i18n/i18n-string";
import type { ApiResult } from "../../admin/api-result";
import { Modal } from "../../shared/dialog";
import { useApiErrorMessage } from "../../shared/use-api-action";
import { Button } from "../button";
import { FormActions, FormGrid, FormSection } from "./form-kit";
import { ContentLanguageScope, I18nTextInput } from "./i18n-text-input";
import { MultiSelect, NumberInput, PasswordInput, Select, Switch, Textarea, TextInput } from "./input";
import { RichTextInput } from "./rich-text-input";

export type FormOption = { value: string; label: string; disabled?: boolean };

type FieldBase<Values> = {
  name: keyof Values & string; label: string; description?: string; placeholder?: string; required?: boolean; disabled?: boolean;
  /** Takes the whole row of the grid. */
  wide?: boolean;
  /** Shown only while this holds for the form's current values. */
  when?: (values: Values) => boolean;
};

/** One field of a form, by what it holds; the control, its validation message and its place in the grid follow. */
export type FormField<Values> = FieldBase<Values> & (
  | { type: "text" | "email" | "tel" | "url" | "date" | "time"; maxLength?: number }
  | { type: "password"; maxLength?: number }
  | { type: "textarea"; maxLength?: number; rows?: number }
  | { type: "number"; min?: number; max?: number; step?: number; suffix?: string }
  | { type: "select"; options: readonly FormOption[]; clearable?: boolean }
  | { type: "multiselect"; options: readonly FormOption[] }
  | { type: "switch" }
  /** One of the workspace's named label colours. */
  | { type: "color"; colors: readonly string[] }
  | { type: "richtext"; maxLength?: number; minRows?: number }
  /** Copy in both languages (`I18nString`), edited under the form's `PT | EN` switch. */
  | { type: "i18n"; maxLength: number; multiline?: boolean }
  | { type: "custom"; render: (control: { value: unknown; onChange: (value: unknown) => void; error?: string; disabled: boolean }) => ReactNode }
);

export type FormSectionSpec = { title: string; description?: string; icon?: LucideIcon; fields: readonly string[] };

export type AutoFormProps<Values extends Record<string, unknown>> = {
  fields: ReadonlyArray<FormField<Values>>;
  initial: Values;
  /** Validates (and normalizes) the values before they are sent; its issues are shown under their fields. */
  schema?: z.ZodType;
  /** Receives the validated values. An `ApiResult` refusal keeps the form open with its message. */
  onSubmit: (values: Values) => Promise<ApiResult<unknown> | void>;
  onSuccess?: () => void;
  /** `page`: sections and a bar that follows unsaved changes. `modal`: one grid and fixed actions. */
  layout?: "page" | "modal";
  sections?: readonly FormSectionSpec[];
  submitLabel?: string; onCancel?: () => void; disabled?: boolean;
  /** The toast of a save that went through. */
  success?: string;
  /** Own wording of some refusals, by kind or by the API's code. */
  errors?: Partial<Record<string, string>>;
  /** Extra content above the actions (a note, a preview). */
  children?: ReactNode;
};

/**
 * A form described by its fields: every create, edit and settings form of the product is one of these, so they all
 * validate, report refusals, mark unsaved changes and look the same. The values are plain data; `schema` is the
 * same zod schema the server action checks again.
 */
export function AutoForm<Values extends Record<string, unknown>>({
  fields, initial, schema, onSubmit, onSuccess, layout = "modal", sections, submitLabel, onCancel, disabled = false, success, errors: ownErrors, children,
}: AutoFormProps<Values>) {
  const translate = useTranslations("Common");
  const refusal = useApiErrorMessage();
  const router = useRouter();
  const [saved, setSaved] = useState(initial);
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [failure, setFailure] = useState<string>();
  const [pending, setPending] = useState(false);
  const dirty = JSON.stringify(values) !== JSON.stringify(saved);
  const change = (name: string, value: unknown) => {
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => (current[name] ? { ...current, [name]: "" } : current));
  };

  async function submit(event: FormEvent) {
    event.preventDefault();
    event.stopPropagation();
    setFailure(undefined);
    const parsed = schema ? schema.safeParse(values) : { success: true as const, data: values };
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const name = String(issue.path[0] ?? "");
        if (next[name]) continue;
        const empty = values[name] === "" || values[name] === null || values[name] === undefined;
        next[name] = empty ? translate("validation.required")
          : issue.code === "too_small" ? translate("validation.tooShort", { min: Number(issue.minimum) })
            : issue.code === "too_big" ? translate("validation.tooLong", { max: Number(issue.maximum) }) : translate("validation.invalid");
      }
      return setErrors(next);
    }
    setPending(true);
    const result = await onSubmit(parsed.data as Values).catch((): ApiResult<unknown> => ({ ok: false, error: "unavailable" }));
    setPending(false);
    if (result && !result.ok) return setFailure(refusal(result, ownErrors));
    if (success) notifications.show({ message: success, color: "teal" });
    setSaved(values);
    router.refresh();
    onSuccess?.();
  }

  const control = (field: FormField<Values>) => {
    const value = values[field.name];
    const common = { label: field.label, description: field.description, required: field.required, disabled: disabled || pending || field.disabled, error: errors[field.name] || undefined };
    const text = { ...common, placeholder: field.placeholder, value: (value as string | null) ?? "", onChange: (event: { currentTarget: { value: string } }) => change(field.name, event.currentTarget.value) };
    switch (field.type) {
      case "textarea": return <Textarea {...text} maxLength={field.maxLength} autosize minRows={field.rows ?? 3} maxRows={12} />;
      case "password": return <PasswordInput {...text} maxLength={field.maxLength ?? 128} autoComplete="new-password" />;
      case "number": return <NumberInput {...common} placeholder={field.placeholder} value={(value as number | null) ?? ""} min={field.min} max={field.max} step={field.step} suffix={field.suffix}
        onChange={(next) => change(field.name, next === "" ? null : Number(next))} />;
      case "select": return <Select {...common} placeholder={field.placeholder} data={[...field.options]} value={(value as string | null) || null} clearable={field.clearable ?? !field.required}
        searchable={field.options.length > 8} onChange={(next) => change(field.name, next)} />;
      case "multiselect": return <MultiSelect {...common} placeholder={field.placeholder} data={[...field.options]} value={(value as string[] | null) ?? []} searchable={field.options.length > 8}
        onChange={(next) => change(field.name, next)} />;
      case "switch": return <Switch label={field.label} description={field.description} disabled={common.disabled} checked={value === true} onChange={(event) => change(field.name, event.currentTarget.checked)} />;
      case "color": return <Input.Wrapper label={field.label} description={field.description} error={common.error}>
        <Group gap={6} mt={6} role="radiogroup" aria-label={field.label}>
          {field.colors.map((color) => <ColorSwatch key={color} component="button" type="button" role="radio" aria-checked={value === color} aria-label={color} disabled={common.disabled}
            color={`var(--mantine-color-${color}-6)`} size={26} onClick={() => change(field.name, color)} style={{ cursor: "pointer", color: "#fff" }}>
            {value === color && <Check size={14} aria-hidden="true" />}
          </ColorSwatch>)}
        </Group>
      </Input.Wrapper>;
      case "richtext": return <RichTextInput {...common} placeholder={field.placeholder} value={(value as string | null) ?? ""} maxLength={field.maxLength} minRows={field.minRows}
        onChange={(next) => change(field.name, next)} />;
      case "i18n": return <I18nTextInput label={field.label} description={field.description} required={field.required} disabled={common.disabled} maxLength={field.maxLength}
        multiline={field.multiline} value={(value as I18nString | null) ?? {}} onChange={(next) => change(field.name, next)} />;
      case "custom": return field.render({ value, onChange: (next) => change(field.name, next), error: common.error, disabled: !!common.disabled });
      default: return <TextInput {...text} type={field.type} maxLength={field.maxLength} />;
    }
  };

  const visible = fields.filter((field) => !field.when || field.when(values));
  const grid = (names?: readonly string[]) => <FormGrid>
    {visible.filter((field) => !names || names.includes(field.name)).map((field) =>
      <div key={field.name} style={field.wide || ["textarea", "richtext", "switch", "color", "custom"].includes(field.type) ? { gridColumn: "1 / -1" } : undefined}>{control(field)}</div>)}
  </FormGrid>;
  const body = <Stack gap="lg">
    {sections ? sections.map((section) => <FormSection key={section.title} title={section.title} description={section.description} icon={section.icon}>{grid(section.fields)}</FormSection>) : grid()}
    {children}
    {failure && <Alert color="red" variant="light" radius="md" role="alert">{failure}</Alert>}
    <FormActions sticky={layout === "page"} dirty={layout === "modal" || dirty} pending={pending} disabled={disabled} submitLabel={submitLabel}
      onDiscard={layout === "page" ? () => { setValues(saved); setErrors({}); setFailure(undefined); } : undefined}>
      {layout === "modal" && onCancel && <Button type="button" variant="default" onClick={onCancel} disabled={pending}>{translate("actions.cancel")}</Button>}
    </FormActions>
  </Stack>;
  return <form onSubmit={(event) => void submit(event)} noValidate>
    {fields.some((field) => field.type === "i18n") ? <ContentLanguageScope disabled={disabled || pending}>{body}</ContentLanguageScope> : body}
  </form>;
}

/** An {@link AutoForm} in the shared dialog: how a list creates and edits its items without leaving the page. */
export function FormModal<Values extends Record<string, unknown>>({ opened, onClose, title, size = "lg", ...form }: AutoFormProps<Values> & {
  opened: boolean; onClose: () => void; title: string; size?: "md" | "lg" | "xl";
}) {
  return <Modal opened={opened} onClose={onClose} title={title} size={size} centered radius="lg">
    {opened && <AutoForm {...form} layout="modal" onCancel={onClose} onSuccess={() => { form.onSuccess?.(); onClose(); }} />}
  </Modal>;
}
