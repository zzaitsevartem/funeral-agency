import "server-only";
import { referenceCategories, type Category, type Product, type ProductList } from "@/lib/catalog-shared";

const internalOrigin = (process.env.API_INTERNAL_URL || "http://127.0.0.1:8081").replace(/\/$/, "");

async function readApi<T>(path: string, fallback: T): Promise<T> {
  try {
    const response = await fetch(`${internalOrigin}/api${path}`, { cache: "no-store" });
    if (!response.ok) return fallback;
    return await response.json() as T;
  } catch {
    return fallback;
  }
}

export async function getCategories(): Promise<Category[]> {
  const result = await readApi<{ items: Category[] }>("/catalog/categories", { items: [] });
  return result.items?.length ? result.items : referenceCategories;
}

export async function getProducts(params: Record<string, string | number | undefined> = {}): Promise<ProductList> {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => value !== undefined && value !== "" && query.set(key, String(value)));
  return readApi<ProductList>(`/catalog/products?${query}`, { items: [], total: 0, page: 1, limit: 24 });
}

export async function getProduct(path: string): Promise<Product | null> {
  return readApi<Product | null>(`/catalog/product?path=${encodeURIComponent(path)}`, null);
}

export type PublishedPage = {
  slug?: string;
  title?: string;
  body?: string;
  sections?: { heading?: string; body: string }[];
  active?: boolean;
  published?: boolean;
};

export async function getPublishedPage(slug: string): Promise<PublishedPage | null> {
  const page = await readApi<PublishedPage | null>(`/pages/${encodeURIComponent(slug)}`, null);
  if (!page || page.active === false || page.published === false) return null;
  return page;
}
