/** Ease-in-out (cubic): starts and ends gently. */
const ease = (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

/**
 * Glides the window to `target` with an ease-in-out curve, then moves the focus to it without jumping. It stops
 * `offset` pixels above it, or at the target's own `scroll-margin-top` when it sets one (the readers' headings),
 * clearing the sticky headers. Visitors who ask for reduced motion are taken there at once. Browser only.
 */
export function easeScrollTo(target: HTMLElement, offset = 0) {
  const margin = parseFloat(getComputedStyle(target).scrollMarginTop) || offset;
  const start = window.scrollY;
  const end = Math.max(0, target.getBoundingClientRect().top + start - margin);
  const distance = end - start;
  const done = () => {
    if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
    target.focus({ preventScroll: true });
  };
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || Math.abs(distance) < 2) {
    window.scrollTo(0, end);
    return done();
  }
  // Longer trips take a little longer, within bounds, so the glide reads the same on any page length.
  const duration = Math.min(1400, Math.max(600, Math.abs(distance) * 0.6));
  const begin = performance.now();
  const step = (now: number) => {
    const progress = Math.min(1, (now - begin) / duration);
    window.scrollTo(0, start + distance * ease(progress));
    if (progress < 1) requestAnimationFrame(step);
    else done();
  };
  requestAnimationFrame(step);
}
