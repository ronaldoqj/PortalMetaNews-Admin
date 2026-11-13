import { getTranslations } from "next-intl/server";
import { Notice, Page } from "../ui";

/**
 * What an administration page shows to an account without its permission: a clear notice instead of the content.
 * The API refuses the data anyway; this only spares the account an error.
 */
export async function ForbiddenNotice({ title }: { title: string }) {
  const translate = await getTranslations("Access");
  return <Page title={title}>
    <Notice tone="warning" title={translate("forbiddenTitle")}>{translate("forbiddenDescription")}</Notice>
  </Page>;
}
