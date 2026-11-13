"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/** A navigation the router never completes (an aborted one, a link whose own handler cancels it) stops showing after this. */
const GIVE_UP_MS = 15_000;

/** Whether a click on this element starts a client navigation to another page of the same origin. */
function navigatesAway(event: MouseEvent): boolean {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
  const anchor = event.target instanceof Element ? event.target.closest("a[href]") : null;
  if (!(anchor instanceof HTMLAnchorElement) || anchor.hasAttribute("download")) return false;
  if (anchor.target && anchor.target !== "_self") return false;
  const target = new URL(anchor.href, window.location.href);
  return target.origin === window.location.origin
    && (target.pathname !== window.location.pathname || target.search !== window.location.search);
}

/**
 * A thin bar along the top of every area from a click on an internal link until the next page is in place,
 * so a navigation waiting for the server shows at once that it is under way (the site, whose frame belongs to
 * each page, has no `loading.tsx`). Purely visual: it reads only the clicked link and records nothing.
 */
export function NavigationProgress() {
  const location = `${usePathname()}?${useSearchParams().toString()}`;
  // The page the navigation started from: the bar shows while the router is still on it.
  const [from, setFrom] = useState<string | null>(null);
  const current = useRef(location);
  useEffect(() => {
    current.current = location;
  }, [location]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    // Capture phase: `Link` cancels the browser's own navigation before a bubbling listener would see the click.
    function start(event: MouseEvent) {
      if (!navigatesAway(event)) return;
      setFrom(current.current);
      clearTimeout(timer);
      timer = setTimeout(() => setFrom(null), GIVE_UP_MS);
    }
    document.addEventListener("click", start, true);
    return () => {
      document.removeEventListener("click", start, true);
      clearTimeout(timer);
    };
  }, []);

  return <div className="navigation-progress" data-active={from === location || undefined} aria-hidden="true" />;
}
