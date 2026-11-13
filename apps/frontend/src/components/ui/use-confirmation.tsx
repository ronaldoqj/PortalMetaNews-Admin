"use client";

import { notifications } from "@mantine/notifications";
import { useState, type ReactNode } from "react";
import type { ApiResult } from "../admin/api-result";
import { ConfirmationDialog, type ConfirmationTone } from "../shared/confirmation-dialog";
import { useApiErrorMessage } from "../shared/use-api-action";

export type ConfirmationRequest = {
  title: string; description: string; tone?: ConfirmationTone; confirmLabel?: string;
  /** The person must type this (a name, a code) before the action runs: for what cannot be undone. */
  confirmation?: string;
  run: () => Promise<ApiResult<unknown> | void>;
  /** The toast of an action that went through, and what happens next. */
  success?: string; done?: () => void;
  /** Own wording of some refusals, by kind or by the API's code. */
  errors?: Partial<Record<string, string>>;
};

/**
 * One confirmation dialog for a whole screen: `ask` opens it for an action, runs the action on confirm, keeps the
 * dialog open with the refusal when the API says no, and closes it otherwise. Render `dialog` once.
 */
export function useConfirmation(): { ask: (request: ConfirmationRequest) => void; dialog: ReactNode } {
  const [request, setRequest] = useState<ConfirmationRequest>();
  const [value, setValue] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const message = useApiErrorMessage();
  const close = () => { if (!pending) setRequest(undefined); };
  async function confirm() {
    if (!request) return;
    setPending(true);
    setError(undefined);
    const result = await request.run().catch((): ApiResult<unknown> => ({ ok: false, error: "unavailable" }));
    setPending(false);
    if (result && !result.ok) return setError(message(result, request.errors));
    if (request.success) notifications.show({ message: request.success, color: "teal" });
    setRequest(undefined);
    request.done?.();
  }
  return {
    ask: (next) => { setValue(""); setError(undefined); setRequest(next); },
    dialog: <ConfirmationDialog opened={!!request} title={request?.title ?? ""} description={request?.description ?? ""} tone={request?.tone}
      confirmLabel={request?.confirmLabel} confirmation={request?.confirmation} value={value} onValueChange={setValue} pending={pending} error={error}
      onClose={close} onConfirm={() => void confirm()} />,
  };
}
