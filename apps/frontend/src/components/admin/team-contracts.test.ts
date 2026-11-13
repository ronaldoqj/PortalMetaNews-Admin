import { describe, expect, it } from "vitest";
import { getMessagesForLocale, type MessageTree } from "../../i18n/messages";
import { PERMISSIONS } from "./permissions";
import { PERMISSION_GROUPS, permissionKey, teamUserSchema } from "./team-contracts";

const has = (tree: MessageTree, path: string) => typeof path.split(".").reduce<unknown>((node, key) => (node as MessageTree)?.[key], tree) === "string";

describe("team contracts", () => {
  it("files every permission in exactly one group, each named and explained in both languages", () => {
    const grouped = PERMISSION_GROUPS.flatMap((group) => group.permissions);
    expect([...grouped].sort()).toEqual([...PERMISSIONS].sort());
    for (const locale of ["pt", "en"] as const) {
      const messages = getMessagesForLocale(locale);
      for (const group of PERMISSION_GROUPS) expect(has(messages, `Access.permissionGroups.${group.key}`)).toBe(true);
      for (const permission of PERMISSIONS) {
        expect(has(messages, `Access.permissions.${permissionKey(permission)}.label`)).toBe(true);
        expect(has(messages, `Access.permissions.${permissionKey(permission)}.description`)).toBe(true);
      }
    }
  });

  it("reads an account as the API answers it", () => {
    const account = {
      id: "0b0e7a3c-2f1d-4f43-9d50-0e8b8f2c1a11", name: "Ana", email: "ana@example.org", avatarVersion: null, roleId: "1b0e7a3c-2f1d-4f43-9d50-0e8b8f2c1a11",
      enabled: true, requiresPasswordChange: false, jobTitle: {}, bio: { pt: "Repórter" }, createdAt: "2026-11-13T10:00:00.000Z", lastLoginAt: null, news: 3,
    };
    expect(teamUserSchema.safeParse(account).success).toBe(true);
    expect(teamUserSchema.safeParse({ ...account, phone: "1" }).success).toBe(false);
  });
});
