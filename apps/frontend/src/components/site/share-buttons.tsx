"use client";

import { IconBrandFacebook, IconBrandLinkedin, IconBrandWhatsapp, IconBrandX } from "@tabler/icons-react";
import { Check, Link2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import styles from "./site.module.css";

/**
 * Sharing an article: plain links to each network's own share address (no script, button or pixel of theirs on the
 * page, so nothing about the reader reaches them before they choose to share) and a copy of the link.
 */
export function ShareButtons({ url, title }: { url: string; title: string }) {
  const translate = useTranslations("Article.share");
  const [copied, setCopied] = useState(false);
  const link = encodeURIComponent(url);
  const text = encodeURIComponent(title);
  const targets = [
    { key: "whatsapp", href: `https://wa.me/?text=${text}%20${link}`, icon: IconBrandWhatsapp },
    { key: "x", href: `https://x.com/intent/post?text=${text}&url=${link}`, icon: IconBrandX },
    { key: "facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${link}`, icon: IconBrandFacebook },
    { key: "linkedin", href: `https://www.linkedin.com/sharing/share-offsite/?url=${link}`, icon: IconBrandLinkedin },
  ] as const;
  return <div className={styles.share} role="group" aria-label={translate("label")}>
    {targets.map(({ key, href, icon: Icon }) => <a key={key} href={href} target="_blank" rel="noopener noreferrer" aria-label={translate(key)} title={translate(key)}>
      <Icon size={17} stroke={1.7} aria-hidden="true" />
    </a>)}
    <button type="button" aria-label={translate(copied ? "copied" : "copy")} title={translate(copied ? "copied" : "copy")}
      onClick={() => { void navigator.clipboard?.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2500); }); }}>
      {copied ? <Check size={16} aria-hidden="true" /> : <Link2 size={16} aria-hidden="true" />}
    </button>
    <span aria-live="polite" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>{copied ? translate("copied") : ""}</span>
  </div>;
}
