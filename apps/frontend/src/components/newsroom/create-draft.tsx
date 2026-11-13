"use client";

import { Center, Loader, Stack, Text } from "@mantine/core";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "../../i18n/navigation";
import { useApiErrorMessage } from "../shared/use-api-action";
import { Notice } from "../ui";
import { createDraft } from "./actions";

/**
 * `/noticias/nova` opened by its address: creates the draft from the browser (never while the page is rendered or
 * prefetched, so a prefetch never creates one) and moves on to its builder.
 */
export function CreateDraft() {
  const translate = useTranslations("News");
  const router = useRouter();
  const message = useApiErrorMessage();
  const started = useRef(false);
  const [error, setError] = useState<string>();
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void createDraft().then((result) => {
      if (result.ok) router.replace({ pathname: "/panel/news/[id]", params: { id: result.data.id } });
      else setError(message(result));
    });
  }, [router, message]);
  return error ? <Notice tone="danger">{error}</Notice>
    : <Center py="xl"><Stack align="center" gap="sm"><Loader /><Text c="dimmed">{translate("creating")}</Text></Stack></Center>;
}
