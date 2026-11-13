import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AuthLayout } from "@/components/layout/auth-layout";

export const metadata: Metadata = { robots: { index: false, follow: false }, referrer: "no-referrer" };

export default function Layout({ children }: { children: ReactNode }) {
  return <AuthLayout>{children}</AuthLayout>;
}
