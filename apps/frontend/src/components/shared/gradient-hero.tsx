import type { ReactNode } from "react";
import { Title } from "../ui/title";
import styles from "./gradient-hero.module.css";

/** The opening card of a page: its title and description over the identity's soft gradient, with whatever the page adds below. */
export function GradientHero({ eyebrow, title, description, aside, children }: {
  eyebrow?: ReactNode; title: ReactNode; description?: ReactNode;
  /** Shown beside the title on wide screens, under it on narrow ones. */
  aside?: ReactNode;
  children?: ReactNode;
}) {
  return <header className={styles.hero}>
    <div className={styles.top}>
      <div className={styles.text}>
        {eyebrow && <span className={styles.eyebrow}>{eyebrow}</span>}
        <Title order={1} className={styles.title}>{title}</Title>
        {description && <p className={styles.description}>{description}</p>}
      </div>
      {aside && <div className={styles.aside}>{aside}</div>}
    </div>
    {children}
  </header>;
}

/** A figure of a hero's row: an icon, the value in strong type and what it counts. */
export function HeroStat({ icon, value, label, labelFirst = false }: { icon: ReactNode; value: ReactNode; label: ReactNode; labelFirst?: boolean }) {
  return <span className={styles.stat}>{icon}{labelFirst && label}<strong>{value}</strong>{!labelFirst && label}</span>;
}

export function HeroStats({ children }: { children: ReactNode }) {
  return <div className={styles.stats}>{children}</div>;
}
