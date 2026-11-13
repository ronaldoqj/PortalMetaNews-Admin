import { getLocale, getTranslations } from "next-intl/server";
import { headers } from "next/headers";
import type { ReactNode } from "react";
import { z } from "zod";
import { siteDomain } from "../../config/site-hosts";
import { getPathname } from "../../i18n/navigation";
import { areaUrl } from "../../theme/host-context";
import { getRequestBranding } from "../../theme/request-branding";
import { panelApi } from "../admin/api-call";
import type { Actor } from "../admin/contracts";
import { SYSTEM_ROLE_SLUGS } from "../admin/permissions";
import { logout } from "../auth/actions";
import { PanelShell } from "./panel-shell";

const badgesSchema = z.object({ review: z.number().int().nonnegative(), messages: z.number().int().nonnegative() }).strict();

/** The server side of the shell: the account, its role in the interface's language, the logos, the counters and sign-out. */
export async function PanelFrame({ actor, children }: { actor: Actor; children: ReactNode }) {
  const [translate, locale, { assets, site }, badges, requestHeaders] = await Promise.all([
    getTranslations(), getLocale(), getRequestBranding(), panelApi("panel/badges", { schema: badgesSchema }), headers(),
  ]);
  const role = actor.roleSlug && (SYSTEM_ROLE_SLUGS as readonly string[]).includes(actor.roleSlug) ? translate(`Roles.system.${actor.roleSlug}`) : actor.roleName;
  const siteUrl = areaUrl("site", requestHeaders.get("host") ?? "localhost", siteDomain(), getPathname({ locale, href: "/site" }));
  return <PanelShell user={{ id: actor.userId, name: actor.name, email: actor.email, role, avatarVersion: actor.avatarVersion }}
    permissions={actor.permissions} logo={{ light: assets.logo, dark: assets.logoDark, alt: site?.siteName ?? translate("Common.brand") }}
    siteUrl={siteUrl} badges={badges.ok ? badges.data : { review: 0, messages: 0 }} logout={logout.bind(null, locale)}>
    {children}
  </PanelShell>;
}
