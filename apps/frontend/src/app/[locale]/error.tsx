"use client";

import { ArrowLeft, RotateCw } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { ErrorState } from "@/components/shared/error-state";
import { Button } from "@/components/ui/button";

/**
 * Localized page for an unexpected error in any area, inside the root layout, so it keeps the area's
 * identity and language. Server errors reach it as a generic message with a digest, which it shows as the
 * reference that matches the server log; nothing about the error itself is displayed.
 */
export default function ErrorPage({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const translate = useTranslations("ErrorPage");
  const locale = useLocale();

  return (
    <ErrorState
      kind="error"
      code="500"
      eyebrow={translate("eyebrow")}
      title={translate("title")}
      description={translate("description")}
      footnote={error.digest && translate("reference", { digest: error.digest })}
      actions={<>
        <Button onClick={retry} size="md" leftSection={<RotateCw size={18} aria-hidden="true" />}>{translate("retry")}</Button>
        <Button component="a" href={`/${locale}`} size="md" variant="default" leftSection={<ArrowLeft size={18} aria-hidden="true" />}>
          {translate("home")}
        </Button>
      </>}
    />
  );
}
