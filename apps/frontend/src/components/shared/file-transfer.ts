/** Why a file could not be sent or fetched, as the interface names it; the API may add a `code` with the exact reason. */
export type RelayError =
  | "invalidInput" | "forbidden" | "notFound" | "conflict" | "tooLarge" | "unsupportedType" | "rateLimited" | "aborted" | "unavailable";

export type TransferResult<Data> = { data?: Data; error?: RelayError; code?: string };

export function relayErrorFromStatus(status: number): RelayError {
  if (status === 400 || status === 411 || status === 422) return "invalidInput";
  if (status === 401 || status === 403) return "forbidden";
  if (status === 404) return "notFound";
  if (status === 409) return "conflict";
  if (status === 413) return "tooLarge";
  if (status === 415) return "unsupportedType";
  if (status === 429) return "rateLimited";
  return "unavailable";
}

/**
 * Sends one file, with optional text fields, to a same-origin route handler. XHR is used because `fetch` exposes
 * no upload progress. The session travels in its HttpOnly cookie, never in a header the page could read.
 */
export function uploadFile(url: string, file: File, options: {
  fields?: Record<string, string | undefined>;
  onProgress?: (fraction: number) => void;
  signal?: AbortSignal;
} = {}): Promise<TransferResult<unknown>> {
  return new Promise((resolve) => {
    const request = new XMLHttpRequest();
    const body = new FormData();
    // Fields first: the API reads them before the file ends.
    for (const [name, value] of Object.entries(options.fields ?? {})) if (value !== undefined) body.append(name, value);
    body.append("file", file, file.name);
    request.open("POST", url);
    request.responseType = "json";
    request.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) options.onProgress?.(Math.min(1, event.loaded / event.total));
    };
    request.onload = () => {
      if (request.status >= 200 && request.status < 300) return resolve({ data: request.response as unknown });
      const answer = request.response as { code?: unknown } | null;
      resolve({ error: relayErrorFromStatus(request.status), ...(typeof answer?.code === "string" ? { code: answer.code } : {}) });
    };
    request.onerror = () => resolve({ error: "unavailable" });
    request.ontimeout = () => resolve({ error: "unavailable" });
    request.onabort = () => resolve({ error: "aborted" });
    options.signal?.addEventListener("abort", () => request.abort(), { once: true });
    request.send(body);
  });
}
