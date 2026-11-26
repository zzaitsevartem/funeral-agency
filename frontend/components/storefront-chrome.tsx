"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { CookieNotice, SiteFooter, SiteHeader } from "@/components/site-shell";

const sourceStyles = [
  "/local/templates/FAVORITE_LK/assets/style.min.css",
  "/local/templates/FAVORITE_LK/components/bitrix/menu/catalogMenu/style.min.css",
  "/local/templates/FAVORITE_LK/assets/custom.min.css",
  "/local/templates/FAVORITE_LK/assets/media769.min.css",
  "/local/templates/FAVORITE_LK/assets/media993.min.css",
  "/local/templates/FAVORITE_LK/assets/media1201.min.css",
  "/local/templates/FAVORITE_LK/assets/media1401.min.css",
  "/local/templates/FAVORITE_LK/assets/media1402.min.css",
  "/bitrix/cache/css/s1/FAVORITE_LK/page_b6bab3a436a3e31268ff86f7526c2521/page_b6bab3a436a3e31268ff86f7526c2521_v1.css",
  "/bitrix/cache/css/s1/FAVORITE_LK/template_0801fb9ca40d83f000493ee8658c0d28/template_0801fb9ca40d83f000493ee8658c0d28_v1.css",
];

export function StorefrontChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/";
  const isAdmin = pathname === "/admin" || pathname.startsWith("/admin/") ||
    /^\/a-[a-f0-9]{24,64}(?:\/register)?\/?$/.test(pathname);

  useEffect(() => {
    document.body.classList.toggle("storefront-body", !isAdmin);
    if (isAdmin) return;
    const links = sourceStyles.map(href => {
      const link = document.createElement("link");
      link.rel = "stylesheet"; link.href = href; link.dataset.storefrontStyle = "true";
      document.head.appendChild(link); return link;
    });
    return () => { links.forEach(link => link.remove()); document.body.classList.remove("storefront-body"); };
  }, [isAdmin]);

  if (isAdmin) return <>{children}</>;
  return <><SiteHeader /><main className="site-main">{children}</main><SiteFooter /><CookieNotice /></>;
}
