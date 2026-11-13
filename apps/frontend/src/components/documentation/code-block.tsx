"use client";

import { Check, Copy } from "lucide-react";
import type { ReactNode } from "react";
import { Tooltip } from "../shared/dialog";
import { ActionIcon, CopyButton } from "../ui/button";
import styles from "./documentation.module.css";

/** A code block with its language and a button that copies its text; the copy happens only in the browser. */
export function CodeBlock({ code, language, labels, children }: { code: string; language?: string; labels: { copy: string; copied: string }; children: ReactNode }) {
  return <div className={styles.code}>
    <div className={styles.codeBar}>
      <span>{language}</span>
      <CopyButton value={code} timeout={2000}>
        {({ copied, copy }) => <Tooltip label={copied ? labels.copied : labels.copy} withArrow>
          <ActionIcon variant="subtle" color={copied ? "teal" : "gray"} size="sm" onClick={copy} aria-label={copied ? labels.copied : labels.copy}>
            {copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
          </ActionIcon>
        </Tooltip>}
      </CopyButton>
    </div>
    <pre>{children}</pre>
  </div>;
}
