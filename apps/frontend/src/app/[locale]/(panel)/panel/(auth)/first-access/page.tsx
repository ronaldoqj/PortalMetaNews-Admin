import { FirstAccessForm } from "@/components/auth/auth-forms";
import { requirePendingPasswordChange } from "@/components/admin/server";

/** Exists only while a temporary password waits to be replaced. */
export default async function FirstAccessPage() {
  await requirePendingPasswordChange();
  return <FirstAccessForm />;
}
