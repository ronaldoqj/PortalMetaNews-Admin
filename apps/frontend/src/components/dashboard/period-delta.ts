/** Relative change against the previous period, or nothing when there is no base to compare with. */
export function periodDelta(current: number, previous: number): number | undefined {
  return previous > 0 ? (current - previous) / previous : undefined;
}
