import { describe, expect, it } from "vitest";
import { workflowActions } from "./workflow";

const all = { edit: true, publish: true, delete: true };
const reporter = { edit: true, publish: false, delete: false };

describe("workflow actions", () => {
  it.each([
    ["draft", all, ["submit", "publish", "schedule"]],
    ["review", all, ["return", "publish", "schedule"]],
    ["scheduled", all, ["publish", "schedule", "unpublish"]],
    ["published", all, ["unpublish", "archive"]],
    ["archived", all, ["publish", "restore"]],
    ["draft", reporter, ["submit"]],
    ["review", reporter, ["return"]],
    ["published", { edit: false, publish: false, delete: false }, []],
  ] as const)("offers on a %s item what the account may do", (status, permissions, expected) => {
    expect(workflowActions({ status, permissions })).toEqual(expected);
  });
});
