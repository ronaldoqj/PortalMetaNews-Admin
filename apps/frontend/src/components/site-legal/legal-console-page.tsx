import { getTranslations } from "next-intl/server";
import { headers } from "next/headers";
import { currentActor, panelApi } from "../admin/api-call";
import { ForbiddenNotice } from "../admin/forbidden-notice";
import { hasPermission } from "../admin/permissions";
import { siteDomain } from "../../config/site-hosts";
import { getPathname } from "../../i18n/navigation";
import { areaUrl } from "../../theme/host-context";
import { ApiFailureNotice } from "../ui";
import { LEGAL_EDITIONS, legalEditionSchema, type LegalEdition, type LegalEditionData, type LegalKind } from "./contracts";
import { LegalEditor } from "./legal-editor";

/** The panel's page of one legal document (Privacy or Terms of use): its two editions, in tabs. */
export async function LegalConsolePage({ kind }: { kind: LegalKind }) {
  const [translate, actor] = await Promise.all([getTranslations("SiteLegal"), currentActor()]);
  if (!actor || !hasPermission(actor, "site:manage")) return <ForbiddenNotice title={translate(`${kind}.title`)} />;
  const results = await Promise.all(LEGAL_EDITIONS.map((edition) => panelApi(`panel/legal/${kind}/${edition}`, { permission: "site:manage", schema: legalEditionSchema })));
  const failure = results.find((result) => !result.ok);
  if (failure && !failure.ok) return <ApiFailureNotice failure={failure} />;
  const editions = Object.fromEntries(results.map((result, index) => [LEGAL_EDITIONS[index], result.ok ? result.data : null])) as Record<LegalEdition, LegalEditionData>;
  // Where each edition is read on the site: the page of its own language.
  const host = (await headers()).get("host") ?? "localhost";
  const siteUrls = Object.fromEntries(LEGAL_EDITIONS.map((edition) => [edition,
    areaUrl("site", host, siteDomain(), getPathname({ locale: edition, href: kind === "privacy" ? "/site/privacy" : "/site/terms" }))])) as Record<LegalEdition, string>;
  return <LegalEditor kind={kind} editions={editions} siteUrls={siteUrls} />;
}
