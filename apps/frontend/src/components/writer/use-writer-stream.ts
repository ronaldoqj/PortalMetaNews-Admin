"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RelayError } from "../shared/file-transfer";
import { writerEventSchema, type WriterEvent } from "./contracts";
import { parseSse } from "./writer-markdown";

export type StreamResult = { ok: true } | { ok: false; error: RelayError; code?: string };

/**
 * Posts one brief through the panel's relay and hands each event of the answer to `onEvent` as it arrives. `stop`
 * aborts the request, which the API takes as "stop writing" and keeps what was written.
 */
export function useWriterStream() {
  const controller = useRef<AbortController | null>(null);
  const [running, setRunning] = useState(false);
  useEffect(() => () => controller.current?.abort(), []);

  const stream = useCallback(async (url: string, body: unknown, onEvent: (event: WriterEvent) => void): Promise<StreamResult> => {
    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;
    setRunning(true);
    try {
      const response = await fetch(url, {
        method: "POST", headers: { "Content-Type": "application/json", Accept: "text/event-stream" }, body: JSON.stringify(body), signal: abort.signal,
      });
      if (!response.ok || !response.body) {
        const failure: { error?: RelayError; code?: string } = await response.json().catch(() => ({}));
        return { ok: false, error: failure.error ?? "unavailable", code: failure.code };
      }
      const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
      let buffer = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        const parsed = parseSse(buffer + value);
        buffer = parsed.rest;
        for (const item of parsed.events) {
          let data: unknown;
          try { data = JSON.parse(item.data); } catch { continue; }
          const event = writerEventSchema.safeParse(data);
          if (event.success) onEvent(event.data);
        }
      }
      return { ok: true };
    } catch {
      return { ok: false, error: abort.signal.aborted ? "aborted" : "unavailable" };
    } finally {
      if (controller.current === abort) {
        controller.current = null;
        setRunning(false);
      }
    }
  }, []);

  const stop = useCallback(() => controller.current?.abort(), []);
  return { stream, stop, running };
}
