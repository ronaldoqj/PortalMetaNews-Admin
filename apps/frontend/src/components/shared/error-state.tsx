import type { ReactNode } from "react";
import { Title } from "../ui/title";
import { ErrorIllustration } from "./error-illustration";
import styles from "./error-state.module.css";

/**
 * The body of the error pages (404 and 500): the code, a title, what happened and the way out, beside the
 * illustration, over the identity's soft gradient. Standalone it fills the screen; inside the site's frame
 * it takes only its own room. Free of request APIs, so the client error boundary can render it too.
 */
export function ErrorState({ kind, code, eyebrow, title, description, actions, footnote, brand, toolbar, standalone = true }: {
  kind: "not-found" | "error";
  /** The status shown in the artwork. */
  code: string;
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
  /** A last, small line (the reference of an error). */
  footnote?: ReactNode;
  /** The identity's logo, at the top of a standalone page. */
  brand?: ReactNode;
  /** Controls at the top corner (a portal's colour scheme and language). */
  toolbar?: ReactNode;
  standalone?: boolean;
}) {
  return (
    <main className={`${styles.page} ${standalone ? styles.standalone : ""}`}>
      {brand && <div className={styles.brand}>{brand}</div>}
      {toolbar && <div className={styles.toolbar}>{toolbar}</div>}
      <div className={styles.layout}>
        <div className={styles.text}>
          <span className={styles.eyebrow}><span className={styles.eyebrowDot} />{eyebrow}</span>
          <Title order={1} className={styles.title}>{title}</Title>
          <p className={styles.description}>{description}</p>
          {actions && <div className={styles.actions}>{actions}</div>}
          {footnote && <p className={styles.footnote}>{footnote}</p>}
        </div>
        <div className={styles.artwork}><ErrorIllustration kind={kind} code={code} /></div>
      </div>
    </main>
  );
}
