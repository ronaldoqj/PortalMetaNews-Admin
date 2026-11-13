import { getTranslations } from "next-intl/server";
import styles from "@/components/site/site.module.css";
import { Link } from "@/i18n/navigation";

/** A news item, section, tag or author that does not exist (or no longer does), inside the site's frame. */
export default async function SiteNotFound() {
  const translate = await getTranslations("NotFound");
  return <div className={styles.empty} style={{ marginTop: 32 }}>
    <strong>{translate("title")}</strong>
    <p>{translate("description")}</p>
    <Link href="/site">{translate("home")}</Link>
  </div>;
}
