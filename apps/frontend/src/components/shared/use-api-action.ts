"use client";

import { notifications } from "@mantine/notifications";
import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";
import type { ApiErrorKind, ApiResult } from "../admin/api-result";

/**
 * Runs a server action that answers an `ApiResult` and gives the interface what it needs around it: whether it
 * is running, the last refusal (for a message beside the form) and a toast that says how it ended. Refusals are
 * worded by `Common.errors` unless the caller names its own text for a kind.
 *
 *   const save = useApiAction(saveClient, { success: t("saved") });
 *   const result = await save.run(id, draft);   // `result.ok` tells the caller whether to close the dialog
 */
export function useApiAction<Arguments extends unknown[], Data>(action: (...input: Arguments) => Promise<ApiResult<Data>>, options: {
  /** The toast of a call that went through; none when left out. */
  success?: string;
  /** Own wording for some refusals, by kind or by the API's `code`. */
  errors?: Partial<Record<ApiErrorKind | (string & {}), string>>;
  /** No toast on refusal: the caller shows `error` itself. */
  quiet?: boolean;
} = {}) {
  const translate = useTranslations("Common.errors");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const { success, errors, quiet } = options;

  const run = useCallback(async (...input: Arguments): Promise<ApiResult<Data>> => {
    setPending(true);
    setError(undefined);
    let result: ApiResult<Data>;
    try {
      result = await action(...input);
    } catch {
      // The action itself could not be reached (offline, a deployment in progress).
      result = { ok: false, error: "unavailable" };
    }
    setPending(false);
    if (result.ok) {
      if (success) notifications.show({ message: success, color: "teal" });
      return result;
    }
    const message = (result.code && errors?.[result.code]) || errors?.[result.error] || translate(result.error);
    setError(message);
    if (!quiet) notifications.show({ message, color: "red" });
    return result;
  }, [action, success, errors, quiet, translate]);

  return { run, pending, error, clearError: useCallback(() => setError(undefined), []) };
}

/** The wording of a refusal outside `useApiAction` (a page that loaded with an error, an upload). */
export function useApiErrorMessage() {
  const translate = useTranslations("Common.errors");
  return useCallback((failure: { error: ApiErrorKind | "aborted"; code?: string }, own?: Partial<Record<string, string>>): string =>
    (failure.code && own?.[failure.code]) || own?.[failure.error] || translate(failure.error), [translate]);
}
