import type { Metadata } from "next";
import type { ReactNode } from "react";
import { requirePanelSession } from "@/components/admin/server";
import { PanelFrame } from "@/components/layout/panel-frame";

export const metadata: Metadata = { robots: { index: false, follow: false }, referrer: "no-referrer" };

/** Every page of the panel renders only with a full session; the frame draws the menu for the account's permissions. */
export default async function PanelLayout({ children }: { children: ReactNode }) {
  const session = await requirePanelSession();
  return <PanelFrame actor={session.actor}>{children}</PanelFrame>;
}
