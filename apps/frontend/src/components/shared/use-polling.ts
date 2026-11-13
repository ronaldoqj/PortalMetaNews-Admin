"use client";

import { useEffect, useRef } from "react";

/**
 * Runs `refresh` every `intervalMs` while the tab is visible, and once more as soon as it becomes
 * visible again, so a hidden tab never polls. Overlapping runs are skipped.
 */
export function usePolling(refresh: () => Promise<unknown>, intervalMs: number, enabled = true) {
  const latest = useRef(refresh);
  useEffect(() => { latest.current = refresh; });
  useEffect(() => {
    if (!enabled) return;
    let running = false;
    const tick = async () => {
      if (running || document.visibilityState !== "visible") return;
      running = true;
      try { await latest.current(); } finally { running = false; }
    };
    const timer = window.setInterval(() => void tick(), intervalMs);
    const onVisible = () => { if (document.visibilityState === "visible") void tick(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", onVisible); };
  }, [intervalMs, enabled]);
}
