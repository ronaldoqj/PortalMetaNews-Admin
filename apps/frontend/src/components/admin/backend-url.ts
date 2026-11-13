/** Free of request APIs, so the proxy can reach the API too. */
export class AdminApiError extends Error {
  /** `body` is the parsed JSON of an error response, when the API sent one; callers validate what they read. */
  constructor(readonly status: number, readonly body?: unknown) { super("Administrative service unavailable"); }
}

/** Resolves a relative API path against the operator-defined base URL, refusing anything that escapes it. */
export function backendUrl(path: string): URL {
  const base = process.env.BACKEND_INTERNAL_URL;
  if (!base) throw new AdminApiError(503);
  const endpoint = new URL(base);
  if (!['http:', 'https:'].includes(endpoint.protocol) || endpoint.username || endpoint.password || endpoint.search || endpoint.hash) {
    throw new AdminApiError(503);
  }
  endpoint.pathname = `${endpoint.pathname.replace(/\/$/, "")}/`;
  const target = new URL(path, endpoint);
  if (target.origin !== endpoint.origin || !target.pathname.startsWith(endpoint.pathname)) throw new AdminApiError(503);
  return target;
}
