import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminRegisterForm } from "@/app/admin/AuthForms";
import { isAdminBootstrapAvailable, isAdminEntrySlug } from "@/lib/admin-entry";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Регистрация администратора",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function RegisterPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!isAdminEntrySlug(slug) || !(await isAdminBootstrapAvailable())) notFound();
  return <AdminRegisterForm />;
}
