import type { Metadata } from "next";
import { StorefrontChrome } from "@/components/storefront-chrome";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ритуальные товары и организация похорон | Завод Фаворит",
  description: "Производство ритуальных товаров, помощь с организацией похорон и консультация специалистов завода «Фаворит».",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ru"><body><StorefrontChrome>{children}</StorefrontChrome></body></html>;
}
