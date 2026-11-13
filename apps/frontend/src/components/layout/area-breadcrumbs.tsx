"use client";

import { useTranslations } from "next-intl";
import type { AppRoute } from "../../i18n/routing";
import { Breadcrumbs, type Crumb } from "../shared/breadcrumbs";
import { TRAILS } from "./area-navigation";

/** The panel's breadcrumbs, derived from the current route: "Início" (the dashboard) followed by where the page sits. */
export function AreaBreadcrumbs({ route }: { route?: AppRoute }) {
  const translate = useTranslations();
  const trail = route ? TRAILS[route] : undefined;
  if (!trail) return null;
  const home: Crumb = { label: translate("Breadcrumbs.home"), href: "/panel/dashboard" };
  return <Breadcrumbs items={[home, ...trail.map((step) => ({ label: translate(step.label), href: step.href }))]} />;
}
