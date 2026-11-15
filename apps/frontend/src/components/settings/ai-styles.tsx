"use client";

import { Group, Text } from "@mantine/core";
import { PenTool, Star } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { EmptyState, ResourceManager, StatusBadge, useApiAction, type FormField } from "../ui";
import { makeAiStyleDefault, removeAiStyle, saveAiStyle } from "./actions";
import { AI_STYLE_LIMITS, aiStyleInputSchema, type AiStyle, type AiStyleInput } from "./contracts";

/**
 * The newsroom's editorial styles for the AI: named instructions that go into its prompts. The default applies
 * wherever no one chooses (translation, a new conversation of the AI writer); the writer offers every style.
 */
export function AiStylesManager({ styles }: { styles: readonly AiStyle[] }) {
  const t = useTranslations("AiSettings.styles");
  const router = useRouter();
  const makeDefault = useApiAction(makeAiStyleDefault, { success: t("madeDefault") });
  const fields: FormField<AiStyleInput>[] = [
    { name: "name", type: "text", label: t("fields.name"), placeholder: t("fields.namePlaceholder"), maxLength: AI_STYLE_LIMITS.name, required: true, wide: true },
    { name: "instructions", type: "textarea", label: t("fields.instructions"), description: t("fields.instructionsHelp"), placeholder: t("fields.instructionsPlaceholder"),
      maxLength: AI_STYLE_LIMITS.instructions, rows: 10, required: true, wide: true },
    { name: "isDefault", type: "switch", label: t("fields.isDefault"), description: t("fields.isDefaultHelp"), wide: true },
  ];
  return <ResourceManager<AiStyle, AiStyleInput> title={t("title")} description={t("description")} icon={PenTool} items={styles} listing="ai-styles"
    fields={fields} schema={aiStyleInputSchema}
    // The first style becomes the default: a newsroom with styles always has one that applies.
    blank={{ name: "", instructions: "", isDefault: styles.length === 0 }}
    toValues={(style) => ({ name: style.name, instructions: style.instructions, isDefault: style.isDefault })}
    columns={[
      { key: "name", header: t("columns.name"), render: (style) => <Group gap="xs" wrap="nowrap">
        <Text size="sm" fw={600}>{style.name}</Text>
        {style.isDefault && <StatusBadge tone="brand">{t("default")}</StatusBadge>}
      </Group> },
      { key: "instructions", header: t("columns.instructions"), render: (style) => <Text size="sm" c="dimmed" lineClamp={2} style={{ whiteSpace: "pre-line" }}>
        {style.instructions}
      </Text> },
    ]}
    itemActions={(style) => [!style.isDefault && { label: t("makeDefault"), icon: Star, disabled: makeDefault.pending,
      onClick: async () => { if ((await makeDefault.run(style.id)).ok) router.refresh(); } }]}
    labels={{
      add: t("add"), edit: t("edit"), removeTitle: t("removeTitle"), saved: t("saved"), removed: t("removed"),
      removeDescription: (style) => style.isDefault ? t("removeDefaultDescription", { name: style.name }) : t("removeDescription", { name: style.name }),
    }}
    errors={{ ai_style_name_taken: t("errors.nameTaken"), ai_style_limit: t("errors.limit"), ai_style_invalid: t("errors.invalid") }}
    save={(id, values) => saveAiStyle(id, values)} remove={(id) => removeAiStyle(id)}
    empty={<EmptyState icon={PenTool} title={t("empty")} description={t("emptyHint")} plain />} />;
}
