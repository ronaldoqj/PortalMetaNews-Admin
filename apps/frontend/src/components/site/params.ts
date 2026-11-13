/** What the site reads from its addresses, validated before any request reaches the API. */

/** A page number from the query: 1 unless a positive integer up to 500 is given. */
export function pageParameter(value: string | string[] | undefined): number {
  const page = Number(Array.isArray(value) ? value[0] : value);
  return Number.isInteger(page) && page >= 1 && page <= 500 ? page : 1;
}

/** A slug from the address, or null when it cannot be one (the page then answers not-found without asking the API). */
export function slugParameter(value: string): string | null {
  let decoded: string;
  try { decoded = decodeURIComponent(value); } catch { return null; }
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(decoded) && decoded.length <= 160 ? decoded : null;
}
