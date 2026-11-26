import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { AdminLoginForm } from "@/app/admin/AuthForms";
import { ContentPage, knownContentRoute } from "@/components/content";
import { hasAdminSession, isAdminBootstrapAvailable, isAdminEntrySlug } from "@/lib/admin-entry";
import { getPublishedPage } from "@/lib/catalog";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return isAdminEntrySlug(slug)
    ? { title: "Вход администратора", robots: { index: false, follow: false }, referrer: "no-referrer" }
    : {};
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  if (isAdminEntrySlug(slug)) {
    if (await hasAdminSession()) redirect("/admin");
    const available = await isAdminBootstrapAvailable();
    return <AdminLoginForm registrationUrl={available ? `/${slug}/register` : undefined} />;
  }
  if (!knownContentRoute(slug)) notFound();
  const content = await getPublishedPage(slug);
  return <ContentPage slug={slug} content={content} />;
}
