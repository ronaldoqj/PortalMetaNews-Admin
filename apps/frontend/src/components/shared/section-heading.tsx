import { Text } from "@mantine/core";
import type { ReactNode } from "react";
import { Title } from "../ui/title";
import classes from "./section-heading.module.css";

/**
 * The one heading for a section's title block: the eyebrow between accent rules, the title, its description and,
 * below them, anything the block still needs (`children`, such as a step indicator). Centered by default, for a
 * section whose content spans the width beneath it, and then it also keeps the room before that content;
 * `align="start"` sets it to the left, for a heading beside its content. `order={1}` makes it the page's own title.
 * Its look lives only in `section-heading.module.css`.
 */
export function SectionHeading({ eyebrow, title, description, align = "center", order = 2, id, children }: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  align?: "center" | "start";
  order?: 1 | 2 | 3;
  id?: string;
  children?: ReactNode;
}) {
  return <div className={align === "center" ? `${classes.root} ${classes.center}` : classes.root}>
    {eyebrow && <Text className={classes.eyebrow}>{eyebrow}</Text>}
    <Title order={order} id={id} className={classes.title}>{title}</Title>
    {description && <Text className={classes.description}>{description}</Text>}
    {children && <div className={classes.extra}>{children}</div>}
  </div>;
}
