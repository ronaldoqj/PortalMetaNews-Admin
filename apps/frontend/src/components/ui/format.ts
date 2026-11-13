"use client";

import { useFormatter, useNow } from "next-intl";
import { useMemo } from "react";

const UNITS = ["B", "KB", "MB", "GB", "TB"] as const;
/** Bytes in binary units, the value formatted by the caller's number formatter. */
export function formatStorage(bytes: number, format: (amount: number, options: { maximumFractionDigits: number }) => string): string {
  let value = Math.max(0, bytes);
  let unit = 0;
  while (value >= 1024 && unit < UNITS.length - 1) { value /= 1024; unit += 1; }
  return `${format(value, { maximumFractionDigits: unit === 0 ? 0 : 1 })} ${UNITS[unit]}`;
}

/** How every screen writes dates, sizes, counts and money, in the interface's language (the server renders in UTC). */
export function useFormat() {
  const formatter = useFormatter();
  const now = useNow();
  return useMemo(() => ({
    /** "12 de nov. de 2026". */
    date: (iso: string) => formatter.dateTime(new Date(iso), { day: "numeric", month: "short", year: "numeric" }),
    /** "12 de nov. de 2026, 14:30". */
    dateTime: (iso: string) => formatter.dateTime(new Date(iso), { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }),
    /** "há 3 horas". */
    relative: (iso: string) => formatter.relativeTime(new Date(iso), now),
    /** Bytes in binary units: "1,4 MB". */
    bytes: (value: number) => formatStorage(value, (amount, options) => formatter.number(amount, options)),
    number: (value: number) => formatter.number(value),
    percent: (share: number) => formatter.number(share, { style: "percent", maximumFractionDigits: 0 }),
    /** An amount in cents: "R$ 149" or "R$ 149,90". */
    money: (cents: number, currency: string) => formatter.number(cents / 100, { style: "currency", currency, minimumFractionDigits: cents % 100 === 0 ? 0 : 2 }),
  }), [formatter, now]);
}
