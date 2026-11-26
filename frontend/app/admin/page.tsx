import type { Metadata } from "next";
import { AdminClient } from "./AdminClient";
import { AdminLoginForm } from "./AuthForms";
import { hasAdminSession } from "@/lib/admin-entry";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function AdminPage() {
  if (!(await hasAdminSession())) return <AdminLoginForm />;
  return <AdminClient />;
}
