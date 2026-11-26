import { notFound } from "next/navigation";
import { Breadcrumbs, ProductListing } from "@/components/storefront";
import { getCategories, getProduct, getProducts } from "@/lib/catalog";
import { categoryByPath } from "@/lib/catalog-shared";
import { ProductDetail } from "@/components/product-detail";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ segments: string[] }>; searchParams: Promise<Record<string,string | string[] | undefined>> };

export default async function CatalogRoute({ params, searchParams }: Props) {
  const [{ segments }, query, categories] = await Promise.all([params, searchParams, getCategories()]);
  const path = `/catalog/${segments.join("/")}/`;
  const product = await getProduct(path);
  if (product) {
    const category = categories.find(item => item.id === product.categoryId);
    const related = category ? await getProducts({ category: category.path, limit: 12 }) : undefined;
    return <ProductDetail product={product} categories={categories} relatedProducts={related?.items.filter(item => item.id !== product.id)} />;
  }

  const current = categoryByPath(categories, path);
  if (!current) notFound();
  const value = (name: string) => { const param = query[name]; return Array.isArray(param) ? param[0] : param; };
  const page = Number(value("page") || "1");
  const attributes=Object.fromEntries(Object.entries(query).filter(([key])=>key.startsWith("attributes[" )).map(([key,param])=>[key,Array.isArray(param)?param[0]:param]));
  const listing = await getProducts({ category: current.path, sort: value("sort"), page: Number.isFinite(page) ? page : 1, limit: 24, minPrice: value("minPrice"), maxPrice: value("maxPrice"), facets: 1, ...attributes });
  return <ProductListing categories={categories} current={current} products={listing.items} total={listing.total} facets={listing.facets} initialPage={listing.page} />;
}
