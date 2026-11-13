"use client";

import { Breadcrumbs as MantineBreadcrumbs, Text } from "@mantine/core";
import { ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "../../i18n/navigation";

type Href = Parameters<typeof Link>[0]["href"];
export type Crumb = { label: string; href?: Href };

/**
 * Where the page sits in the navigation: each step links back, the last one is the current page. Used by
 * the panel (from the route) and by the site.
 */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  const translate = useTranslations("Common");
  if (items.length < 2) return null;
  return <nav aria-label={translate("breadcrumb")} className="app-breadcrumbs">
    <MantineBreadcrumbs separator={<ChevronRight size={14} aria-hidden="true" />} separatorMargin={6}>
      {items.map((item, index) => index < items.length - 1 && item.href
        ? <Link key={index} href={item.href} className="app-breadcrumb-link">{item.label}</Link>
        : <Text key={index} size="sm" c={index === items.length - 1 ? undefined : "dimmed"} fw={index === items.length - 1 ? 600 : 400}
          aria-current={index === items.length - 1 ? "page" : undefined}>{item.label}</Text>)}
    </MantineBreadcrumbs>
  </nav>;
}
