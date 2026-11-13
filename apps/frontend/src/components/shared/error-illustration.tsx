import styles from "./error-state.module.css";

/**
 * The artwork of the error pages, in the vocabulary of the site's banners (concentric rings, a window of
 * rounded lines, floating dots), drawn only with the identity's tokens so it takes the colours of the site
 * or of the client and follows the colour scheme. A magnifier for an address not found, a parted cable for
 * an unexpected error. Decorative: the page's text says everything.
 */
export function ErrorIllustration({ kind, code }: { kind: "not-found" | "error"; code: string }) {
  return (
    <svg viewBox="0 0 520 420" className={styles.art} aria-hidden="true" focusable="false">
      <circle cx="330" cy="168" r="150" className={styles.haloPrimary} />
      <circle cx="140" cy="322" r="104" className={styles.haloSecondary} />
      <circle cx="262" cy="206" r="182" className={styles.ringDashed} />
      <circle cx="262" cy="206" r="134" className={styles.ring} />

      <rect x="128" y="120" width="272" height="196" rx="24" className={styles.cardShadow} />
      <rect x="116" y="104" width="272" height="196" rx="24" className={styles.card} />
      <path d="M140 105h224a23 23 0 0 1 23 23v20H117v-20a23 23 0 0 1 23-23Z" className={styles.cardBar} />
      <circle cx="142" cy="126" r="5" className={styles.dotPrimary} />
      <circle cx="160" cy="126" r="5" className={styles.dotSecondary} />
      <circle cx="178" cy="126" r="5" className={styles.dotMuted} />
      <rect x="200" y="117" width="164" height="18" rx="9" className={styles.address} />
      <text x="252" y="232" textAnchor="middle" className={styles.code}>{code}</text>
      <rect x="168" y="254" width="96" height="10" rx="5" className={styles.lineStrong} />
      <rect x="274" y="254" width="62" height="10" rx="5" className={styles.lineSoft} />
      <rect x="194" y="274" width="54" height="10" rx="5" className={styles.lineSoft} />
      <rect x="258" y="274" width="52" height="10" rx="5" className={styles.lineStrong} />

      {kind === "not-found" ? (
        <g className={styles.float}>
          <path d="M318 330c22-6 34-24 40-44" className={styles.trail} />
          <circle cx="392" cy="262" r="44" className={styles.lens} />
          <path d="M366 246a30 30 0 0 1 22-14" className={styles.glare} />
          <path d="M424 294l38 38" className={styles.handle} />
        </g>
      ) : (
        <g>
          <g className={styles.float}>
            <path d="M178 352c-46 0-58 34-110 34" className={styles.cable} />
            <rect x="178" y="334" width="56" height="36" rx="11" className={styles.plug} />
            <path d="M234 344h16M234 360h16" className={styles.prongs} />
          </g>
          <g className={styles.floatReverse}>
            <path d="M342 352c46 0 58 34 110 34" className={styles.cable} />
            <rect x="286" y="334" width="56" height="36" rx="11" className={styles.socket} />
          </g>
          <path d="M268 326v-12M256 330l-8-8M280 330l8-8" className={styles.spark} />
        </g>
      )}

      <circle cx="70" cy="126" r="6" className={styles.dotSecondary} />
      <circle cx="466" cy="104" r="5" className={styles.dotPrimary} />
      <circle cx="98" cy="232" r="4" className={styles.dotMuted} />
      <circle cx="452" cy="388" r="4" className={styles.dotSecondary} />
    </svg>
  );
}
