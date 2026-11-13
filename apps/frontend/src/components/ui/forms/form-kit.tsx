"use client";

import { SimpleGrid } from "@mantine/core";
import type { LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Button } from "../button";
import classes from "./form-kit.module.css";

/**
 * The building blocks every form of the panel, the console and the portal is made of, so they all read the same
 * way: sections that say what their fields are about, fields in a responsive grid, and one bar of actions that
 * follows the form while it has unsaved changes. Field controls come from `ui/forms/input`.
 */

/**
 * One subject of a form. `split` (the default on a page) puts the heading beside the fields from the desktop
 * breakpoint up; `stacked` keeps it above them, for dialogs, drawers and narrow columns.
 */
export function FormSection({ title, description, icon: Icon, layout = "split", children, aside }: {
  title: ReactNode; description?: ReactNode; icon?: LucideIcon; layout?: "split" | "stacked"; children: ReactNode;
  /** Shown under the description: a hint, a link, a small status. */
  aside?: ReactNode;
}) {
  return <section className={classes.section} data-layout={layout}>
    <div>
      <div className={classes.sectionHeading}>
        {Icon && <span className={classes.sectionIcon} aria-hidden="true"><Icon size={18} /></span>}
        <div style={{ minWidth: 0 }}>
          <h3 className={classes.sectionTitle}>{title}</h3>
          {description && <p className={classes.sectionDescription}>{description}</p>}
        </div>
      </div>
      {aside}
    </div>
    <div className={classes.sectionBody}>{children}</div>
  </section>;
}

/** Fields side by side where there is room: two columns from the tablet breakpoint (or `columns`), one below it. */
export function FormGrid({ children, columns = 2 }: { children: ReactNode; columns?: 2 | 3 }) {
  return <SimpleGrid cols={{ base: 1, sm: 2, lg: columns }} spacing="md" verticalSpacing="md">{children}</SimpleGrid>;
}

/**
 * The actions of a form. On a page (`sticky`, the default) the bar appears only while there is something to save
 * and follows the form down the page; inside a dialog or a drawer pass `sticky={false}` and it is always there.
 */
export function FormActions({ dirty = true, pending = false, onDiscard, submitLabel, discardLabel, sticky = true, disabled = false, children }: {
  dirty?: boolean; pending?: boolean;
  /** Present: a "discard" button that puts the form back as it was loaded. */
  onDiscard?: () => void;
  submitLabel?: string; discardLabel?: string; sticky?: boolean; disabled?: boolean;
  /** Extra actions, before the submit button. */
  children?: ReactNode;
}) {
  const translate = useTranslations("Common");
  if (sticky && !dirty && !pending) return null;
  return <div className={classes.actions} data-static={!sticky} role="group">
    {sticky ? <span className={classes.actionsStatus} role="status"><span className={classes.actionsDot} aria-hidden="true" />{translate("states.unsaved")}</span> : <span />}
    <span style={{ display: "inline-flex", gap: 8, flexWrap: "wrap" }}>
      {onDiscard && <Button type="button" variant="default" onClick={onDiscard} disabled={pending || !dirty}>{discardLabel ?? translate("actions.discard")}</Button>}
      {children}
      <Button type="submit" loading={pending} disabled={disabled || !dirty}>{submitLabel ?? translate("actions.saveChanges")}</Button>
    </span>
  </div>;
}

/** What an empty list, an empty search or a not-yet-used area shows: what belongs there and how to start. */
export function EmptyState({ icon: Icon, title, description, action, plain = false }: {
  icon: LucideIcon; title: ReactNode; description?: ReactNode; action?: ReactNode;
  /** Without the dashed frame, inside a card that already frames it. */
  plain?: boolean;
}) {
  return <div className={classes.empty} data-plain={plain}>
    <span className={classes.emptyIcon} aria-hidden="true"><Icon size={26} /></span>
    <p className={classes.emptyTitle}>{title}</p>
    {description && <p className={classes.emptyDescription}>{description}</p>}
    {action}
  </div>;
}
