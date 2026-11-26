import { getProducts } from "@/lib/catalog";
import { ProductListing } from "@/components/storefront";
import { getCategories } from "@/lib/catalog";
export const dynamic = "force-dynamic";
export default async function SearchPage({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
  const [query,categories]=await Promise.all([searchParams,getCategories()]);
  const get=(key:string)=>{const v=query[key];return Array.isArray(v)?v[0]:v;};
  const q=get("q")?.trim()||"";
  const attributes=Object.fromEntries(Object.entries(query).filter(([key])=>key.startsWith("attributes[" )).map(([key,param])=>[key,Array.isArray(param)?param[0]:param]));
  const result=await getProducts({q,sort:get("sort"),page:Number(get("page")||"1"),limit:24,minPrice:get("minPrice"),maxPrice:get("maxPrice"),facets:1,...attributes});
  const normalize=(value:string)=>value.normalize("NFKC").toLocaleLowerCase("ru-RU").replaceAll("ё","е").replace(/[^\p{L}\p{N}]+/gu," ").trim();
  const terms=normalize(q).split(/\s+/).filter(Boolean);
  const byId=new Map(categories.map(category=>[category.id,category]));
  const productCategoryIds=new Set<string>();
  for(const product of result.items){
    let category=byId.get(product.categoryId);
    while(category&&!productCategoryIds.has(category.id)){
      productCategoryIds.add(category.id);
      category=category.parentId?byId.get(category.parentId):undefined;
    }
  }
  const relevantCategories=categories.filter(category=>
    !category.slug.startsWith("e2e-")&&(
      productCategoryIds.has(category.id)||
      (terms.length>0&&terms.every(term=>normalize(`${category.name} ${category.slug}`).includes(term)))
    )
  );
  return <ProductListing categories={relevantCategories} products={result.items} total={result.total} facets={result.facets} initialPage={result.page} search searchQuery={q} />;
}
