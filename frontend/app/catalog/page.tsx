import { getCategories } from "@/lib/catalog";
import { CategoryGrid } from "@/components/storefront";

export const dynamic = "force-dynamic";

export default async function CatalogPage() {
  const categories = await getCategories();
  return <div className="catalog-home">
    <div className="catalog-title-band"><div className="catalog-title-inner"><h1>Каталог</h1></div></div>
    <div className="page-wrap"><CategoryGrid categories={categories.filter(category => !category.parentId)} variant="catalog-root" /></div>
  </div>;
}
