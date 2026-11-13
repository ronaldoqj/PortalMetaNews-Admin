/**
 * What every call to the API answers in the interface. Plain data, so a server action can return it to the browser:
 * `ok` with the validated answer, or the kind of refusal, with the API's own `code` when it named one
 * (`news_conflict`, `ai_unconfigured`, ...).
 */
export type ApiErrorKind =
  | "invalidInput" | "forbidden" | "notFound" | "conflict" | "rateLimited" | "tooLarge" | "unsupportedType" | "unavailable";

export type ApiFailure = { ok: false; error: ApiErrorKind; code?: string };
export type ApiResult<Data = null> = { ok: true; data: Data } | ApiFailure;

export const INVALID_INPUT: ApiFailure = { ok: false, error: "invalidInput" };
