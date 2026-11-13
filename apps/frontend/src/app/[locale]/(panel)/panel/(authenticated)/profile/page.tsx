import { getTranslations } from "next-intl/server";
import { currentActor, panelApi } from "@/components/admin/api-call";
import { SYSTEM_ROLE_SLUGS } from "@/components/admin/permissions";
import { ProfileEditor } from "@/components/admin/profile-editor";
import { teamUserSchema } from "@/components/admin/team-contracts";
import { ApiFailureNotice, Page } from "@/components/ui";

/** Every account edits its own name, photo and author profile here; e-mail and role belong to whoever manages the team. */
export default async function ProfilePage() {
  const [t, roles, actor, profile] = await Promise.all([
    getTranslations("Profile"), getTranslations("Roles.system"), currentActor(), panelApi("panel/profile", { schema: teamUserSchema }),
  ]);
  const roleLabel = actor?.roleSlug && (SYSTEM_ROLE_SLUGS as readonly string[]).includes(actor.roleSlug) ? roles(actor.roleSlug) : actor?.roleName ?? "";
  return <Page title={t("title")} description={t("description")}>
    {profile.ok
      ? <ProfileEditor key={`${profile.data.name}:${profile.data.avatarVersion ?? ""}`} profile={profile.data} roleLabel={roleLabel} />
      : <ApiFailureNotice failure={profile} />}
  </Page>;
}
