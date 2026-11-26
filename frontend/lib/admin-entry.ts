import "server-only";

import { cookies } from "next/headers";

const entrySlugPattern = /^a-[a-f0-9]{24,64}$/;
const adminCookieNames = new Set(["favorit_admin", "__Host-favorit_admin"]);

export function isAdminEntrySlug(slug: string): boolean {
  const configured = process.env.ADMIN_ENTRY_SLUG ?? "";
  return entrySlugPattern.test(configured) && slug === configured;
}

function adminApiUrl(path: string): string {
  const baseUrl = process.env.API_INTERNAL_URL ?? "http://127.0.0.1:4000";
  return new URL(`/api/admin/${path}`, baseUrl).toString();
}

async function getAdminCookieHeader(): Promise<string> {
  const cookieStore = await cookies();
  return cookieStore
    .getAll()
    .filter(({ name }) => adminCookieNames.has(name))
    .map(({ name, value }) => `${name}=${value}`)
    .join("; ");
}

export async function hasAdminSession(): Promise<boolean> {
  const cookieHeader = await getAdminCookieHeader();
  if (!cookieHeader) return false;

  try {
    const response = await fetch(adminApiUrl("session"), {
      headers: { cookie: cookieHeader },
      cache: "no-store",
    });
    if (!response.ok) return false;
    const session: unknown = await response.json();
    return (
      typeof session === "object" &&
      session !== null &&
      "email" in session &&
      typeof session.email === "string" &&
      session.email.length > 0
    );
  } catch {
    return false;
  }
}

export async function isAdminBootstrapAvailable(): Promise<boolean> {
  try {
    const response = await fetch(adminApiUrl("bootstrap"), {
      cache: "no-store",
    });
    if (!response.ok) return false;
    const result: unknown = await response.json();
    return (
      typeof result === "object" &&
      result !== null &&
      "available" in result &&
      result.available === true
    );
  } catch {
    return false;
  }
}
