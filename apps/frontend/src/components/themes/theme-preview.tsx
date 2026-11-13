"use client";

import { Group, Stack, Text } from "@mantine/core";
import { Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { inputStyleProps } from "../../theme/theme";
import type { Branding, BrandingAssetUrls, ColorScheme } from "../../tokens/branding";
import { SegmentedControl, TextInput } from "../ui/forms/input";
import { previewVariables } from "./preview-variables";
import styles from "./themes.module.css";

/**
 * A miniature of the news site set in the theme being edited: header (in the theme's layout), a breaking-news line,
 * the headline, a row of news cards (in the theme's card style) and a real field. It reads the variables scoped to it,
 * so it shows the edited tokens before they are saved, in either scheme.
 */
export function ThemePreview({ tokens, assets, siteName, scheme: controlled, onSchemeChange }: {
  tokens: Branding; assets: Pick<BrandingAssetUrls, "logo" | "logoDark">; siteName: string;
  scheme?: ColorScheme; onSchemeChange?: (scheme: ColorScheme) => void;
}) {
  const t = useTranslations("Themes.preview");
  const [own, setOwn] = useState<ColorScheme>("light");
  const scheme = controlled ?? own;
  const setScheme = onSchemeChange ?? setOwn;
  const cards = t.raw("cards") as string[];
  const logo = scheme === "dark" ? assets.logoDark : assets.logo;
  return <Stack gap="sm">
    <Group justify="space-between">
      <Text fw={600}>{t("title")}</Text>
      <SegmentedControl size="xs" value={scheme} onChange={(value) => setScheme(value === "dark" ? "dark" : "light")} data={[
        { value: "light", label: <Group gap={4} wrap="nowrap"><Sun size={13} aria-hidden="true" />{t("light")}</Group> },
        { value: "dark", label: <Group gap={4} wrap="nowrap"><Moon size={13} aria-hidden="true" />{t("dark")}</Group> },
      ]} />
    </Group>
    <div className={styles.preview} style={previewVariables(tokens, scheme)} data-header={tokens.site.header} data-cards={tokens.site.cards}
      role="img" aria-label={t("label")}>
      <div className={styles.siteHeader}>
        {/* eslint-disable-next-line @next/next/no-img-element -- a same-origin logo at its natural size */}
        {logo ? <img src={logo} alt={siteName} className={styles.logo} /> : <span className={styles.siteName}>{siteName}</span>}
        <ul className={styles.menu}>
          {(["home", "ai", "devices", "security"] as const).map((item) => <li key={item}>{t(`menu.${item}`)}</li>)}
        </ul>
      </div>
      <div className={styles.body}>
        <div className={styles.breaking}><span className={styles.breakingBadge}>{t("breaking")}</span>{cards[0]}</div>
        <div className={styles.headline}>
          <div className={styles.cover} />
          <div>
            <span className={styles.section}>{t("section")}</span>
            <p className={styles.title}>{t("headline")}</p>
            <p className={styles.subtitle}>{t("subtitle")}</p>
            <span className={styles.meta}>{t("meta")}</span>
            <div><span className={styles.button}>{t("read")}</span></div>
          </div>
        </div>
        <div className={styles.grid}>
          {cards.map((card) => <div key={card} className={styles.card}>
            <div className={styles.thumb} />
            <p className={styles.cardTitle}>{card}</p>
            <span className={styles.meta}>{t("meta")}</span>
          </div>)}
        </div>
        <div className={styles.newsletter}>
          <TextInput {...inputStyleProps(tokens.inputStyle)} label={t("email")} placeholder={t("emailPlaceholder")} readOnly tabIndex={-1} />
          <span className={styles.button}>{t("subscribe")}</span>
        </div>
      </div>
    </div>
  </Stack>;
}
