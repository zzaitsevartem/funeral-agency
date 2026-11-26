export type Category = {
  id: string;
  slug: string;
  parentId: string | null;
  path: string;
  name: string;
  image: string | null;
  sortOrder: number;
  description?: string | null;
};

export type ProductVariant = {
  id: string;
  name: string;
  sku: string;
  price: number;
  attributes: Record<string, string>;
};

export type Product = {
  id: string;
  categoryId: string;
  slug: string;
  path: string;
  name: string;
  sku: string;
  price: number;
  description: string;
  images: string[];
  attributes: Record<string, string>;
  variants: ProductVariant[];
  active: boolean;
};

export type CatalogFacets = {
  minPrice: number | null;
  maxPrice: number | null;
  attributes: { key: string; values: { value: string; count: number }[] }[];
};
export type ProductList = { items: Product[]; total: number; page: number; limit: number; facets?: CatalogFacets };

export const referenceCategories: Category[] = [
  { id: "cat-wreaths", slug: "venki_ritualnye", parentId: null, path: "/catalog/venki_ritualnye/", name: "Венки ритуальные", image: "/upload/resize_cache/iblock/0e9/300_300_1/xjtdr432t6uuxlar1axzio735y8q01wr.png", sortOrder: 10 },
  { id: "cat-coffins", slug: "groby_derevyannye", parentId: null, path: "/catalog/groby_derevyannye/", name: "Гробы", image: "/upload/resize_cache/iblock/65a/300_300_1/sqesdu51kb666p090zbsl7xz2azy4l4p.png", sortOrder: 20 },
  { id: "cat-marble", slug: "izdeliya_iz_litevogo_mramora", parentId: null, path: "/catalog/izdeliya_iz_litevogo_mramora/", name: "Изделия из литьевого мрамора", image: null, sortOrder: 30 },
  { id: "cat-crosses", slug: "kresty_na_mogilu", parentId: null, path: "/catalog/kresty_na_mogilu/", name: "Кресты на могилу", image: "/upload/resize_cache/iblock/092/300_300_1/n91ih8jicbr1bval4gunojkz0y5yuuqk.png", sortOrder: 40 },
  { id: "cat-clothes", slug: "odezhda_ritualnaya", parentId: null, path: "/catalog/odezhda_ritualnaya/", name: "Одежда для погребения", image: "/upload/resize_cache/iblock/aa4/300_300_1/docftr9cxhpnjbh4ig2nzbhhubjvl375.png", sortOrder: 50 },
  { id: "cat-textiles", slug: "tekstil_v_grob", parentId: null, path: "/catalog/tekstil_v_grob/", name: "Текстиль в гроб", image: "/upload/resize_cache/iblock/725/300_300_1/lh6yn1fhrry8kxx58ibkrwq7quem0p3b.png", sortOrder: 60 },
  { id: "cat-urns", slug: "urny_dlya_prakha_", parentId: null, path: "/catalog/urny_dlya_prakha_/", name: "Урны для праха", image: "/upload/iblock/35f/ess9t058p7o7pnms0b0k39e4jatuxnq2.webp", sortOrder: 70 },
  { id: "cat-services", slug: "predostavlenie_uslug", parentId: null, path: "/catalog/predostavlenie_uslug/", name: "Предоставление услуг", image: null, sortOrder: 80 },
  { id: "cat-transport", slug: "transport_katafalnyy_", parentId: null, path: "/catalog/transport_katafalnyy_/", name: "Транспорт катафальный", image: null, sortOrder: 90 },
  { id: "cat-movers", slug: "uslugi_gruzchikov", parentId: null, path: "/catalog/uslugi_gruzchikov/", name: "Услуги грузчиков", image: null, sortOrder: 100 },
];

export function formatPrice(kopecks: number): string {
  return new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(kopecks / 100);
}

export function categoryByPath(categories: Category[], path: string): Category | undefined {
  return categories.find(category => category.path.replace(/\/+$/, "") === path.replace(/\/+$/, ""));
}

export function pathName(path: string): string {
  return path.split("/").filter(Boolean).at(-1) ?? "";
}
