"use client";

import { Stack } from "@mantine/core";
import { HardDrive, Image, Sparkles, Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { DetailList, Notice, Section, Stat, StatGrid, StatusBadge, useFormat } from "../ui";
import type { StorageInfo } from "./contracts";

/** Where files are kept (chosen by the server's environment, never here) and what the media library holds. */
export function StorageSettingsPanel({ info }: { info: StorageInfo }) {
  const t = useTranslations("Storage");
  const format = useFormat();
  return <Stack gap="lg">
    <StatGrid>
      <Stat label={t("items")} value={format.number(info.media.items)} icon={Image} />
      <Stat label={t("size")} value={format.bytes(info.media.bytes)} icon={HardDrive} />
      <Stat label={t("generated")} value={format.number(info.media.generated)} icon={Sparkles} />
      <Stat label={t("uploadLimit")} value={`${info.uploadMaxMb} MB`} icon={Upload} />
    </StatGrid>
    <Section title={t("store")} description={t("storeHelp")} icon={HardDrive}>
      <Stack gap="md">
        <DetailList columns={3} items={[
          { label: t("driver"), value: t(`drivers.${info.driver}`) },
          { label: t("status"), value: <StatusBadge tone={info.reachable ? "success" : "danger"}>{t(info.reachable ? "reachable" : "unreachable")}</StatusBadge> },
          !!info.bucket && { label: t("bucket"), value: info.bucket },
        ]} />
        {!info.reachable && <Notice tone="danger">{t("unreachableNotice")}</Notice>}
        <Notice tone="info">{t("environmentNote")}</Notice>
      </Stack>
    </Section>
  </Stack>;
}
