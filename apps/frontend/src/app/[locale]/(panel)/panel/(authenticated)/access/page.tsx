import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { currentActor, panelApi } from "@/components/admin/api-call";
import { ForbiddenNotice } from "@/components/admin/forbidden-notice";
import { hasPermission } from "@/components/admin/permissions";
import { roleSchema, teamUserSchema } from "@/components/admin/team-contracts";
import { TeamManager } from "@/components/admin/team-manager";
import { ApiFailureNotice, Page } from "@/components/ui";

/** Equipe e perfis: the newsroom's accounts and the roles that grant their permissions (`users:manage`). */
export default async function AccessPage() {
  const [t, actor] = await Promise.all([getTranslations("Access"), currentActor()]);
  if (!actor || !hasPermission(actor, "users:manage")) return <ForbiddenNotice title={t("title")} />;
  const [roles, users] = await Promise.all([
    panelApi("panel/team/roles", { permission: "users:manage", schema: z.array(roleSchema) }),
    panelApi("panel/team/users", { permission: "users:manage", schema: z.array(teamUserSchema) }),
  ]);
  return <Page title={t("title")} description={t("description")}>
    {!roles.ok ? <ApiFailureNotice failure={roles} /> : !users.ok ? <ApiFailureNotice failure={users} />
      : <TeamManager roles={roles.data} users={users.data} currentUserId={actor.userId} />}
  </Page>;
}
