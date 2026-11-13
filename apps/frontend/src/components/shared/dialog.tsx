"use client";

import { Modal as MantineModal, type ModalProps as MantineModalProps } from "@mantine/core";
import { forwardRef, useEffect, type CSSProperties, type ReactNode } from "react";
import classes from "./dialog.module.css";

export { Tooltip } from "@mantine/core";
export type { TooltipProps } from "@mantine/core";

/**
 * The project's only modal. It closes through its close button or the action that completes it, never
 * by Escape or a click on the backdrop, so a stray gesture cannot discard work in progress. Pass
 * `closeOnClickOutside` only where a backdrop click may dismiss it.
 */
export type ModalProps = Omit<MantineModalProps, "closeOnClickOutside" | "closeOnEscape"> & {
  footer?: ReactNode;
  closeOnClickOutside?: boolean;
};

function ModalViewport({ children, style }: { children: ReactNode; style: CSSProperties }) {
  return <div className={classes.viewport} style={style}>{children}</div>;
}

export const Modal = forwardRef<HTMLDivElement, ModalProps>(function Modal({ footer, children, classNames, closeOnClickOutside = false, ...modal }, ref) {
  const props = { ...modal, closeOnClickOutside, closeOnEscape: false };
  /*
   * `overflow-x: hidden` removes the sideways scrollbar but still lets code scroll the dialog: browser
   * extensions that inject their own panels near a password field scroll it into view and shift the whole
   * dialog. Scroll events do not bubble, so one capturing listener undoes any horizontal offset at once.
   */
  useEffect(() => {
    if (!modal.opened) return;
    const keepAligned = (event: Event) => {
      const target = event.target;
      if (target instanceof HTMLElement && target.scrollLeft !== 0 &&
        (target.classList.contains(classes.content) || target.classList.contains(classes.scrollContent))) {
        target.scrollLeft = 0;
      }
    };
    document.addEventListener("scroll", keepAligned, true);
    return () => document.removeEventListener("scroll", keepAligned, true);
  }, [modal.opened]);
  const content = [classes.content, classNames?.content].filter(Boolean).join(" ");
  if (footer == null || footer === false) {
    return <MantineModal {...props} ref={ref} classNames={{ ...classNames, content }}>{children}</MantineModal>;
  }
  return <MantineModal {...props} ref={ref} scrollAreaComponent={ModalViewport}
    classNames={{
      ...classNames,
      content,
      header: [classes.header, classNames?.header].filter(Boolean).join(" "),
      body: [classes.body, classNames?.body].filter(Boolean).join(" "),
    }}>
    <div className={classes.scrollContent}>{children}</div>
    <div className={classes.footer} data-modal-footer>{footer}</div>
  </MantineModal>;
});
