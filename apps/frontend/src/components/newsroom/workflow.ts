import type { NewsAction, NewsView } from "./contracts";

/** Which workflow moves the account sees for an item, by its status and the item's own permissions. */
export function workflowActions(view: Pick<NewsView, "status" | "permissions">): NewsAction[] {
  const { status, permissions } = view;
  const actions: NewsAction[] = [];
  if (status === "draft" && permissions.edit) actions.push("submit");
  if (status === "review" && (permissions.edit || permissions.publish)) actions.push("return");
  if (permissions.publish) {
    if (["draft", "review", "scheduled", "archived"].includes(status)) actions.push("publish");
    if (["draft", "review", "scheduled"].includes(status)) actions.push("schedule");
    if (["published", "scheduled"].includes(status)) actions.push("unpublish");
    if (status === "published") actions.push("archive");
  }
  if (status === "archived" && permissions.publish) actions.push("restore");
  return actions;
}
