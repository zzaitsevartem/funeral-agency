"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { formatPrice, type CatalogFacets, type Category, type Product } from "@/lib/catalog-shared";

export function Breadcrumbs({ items }: { items: { name: string; href?: string }[] }) {
  return <nav className="breadcrumbs" aria-label="Хлебные крошки"><Link href="/">Главная</Link><span>›</span>{items.map((item, index) => <span key={`${item.name}-${index}`}>
    {index > 0 && <span aria-hidden="true">›</span>} {item.href ? <Link href={item.href}>{item.name}</Link> : <span aria-current="page">{item.name}</span>}
  </span>)}</nav>;
}

export function CategoryGrid({ categories, variant }: { categories: Category[]; variant?: "catalog-root" }) {
  return <div className={`category-grid${variant ? ` ${variant}-grid` : ""}`}>{categories.map(category => <Link className="category-card" href={category.path} key={category.id} data-testid="category-card">
    {category.image && <img src={category.image} alt="" loading="lazy" />}
    <span>{category.name}</span>
  </Link>)}</div>;
}

export function ProductCard({ product }: { product: Product }) {
  return <article className="v-product-card-item item-max" data-testid="product-card">
    <Link href={product.path} className="product-card-image" aria-label={product.name}>{product.images[0] && <img className="img" src={product.images[0]} alt={product.name} loading="lazy" />}</Link>
    <div className="name-wrapper"><Link href={product.path} className="name">{product.name}</Link></div>
    <div className="article"><span>Артикул:</span><span>{product.sku || "—"}</span></div>
    <div className="price-grid"><span className="price">{formatPrice(product.price)}</span></div>
    <div className="product-card-actions"><Link className="v-btn outline" href={product.path}>Подробнее</Link></div>
  </article>;
}

export function ProductGrid({ products, emptyMessage }: { products: Product[]; emptyMessage?: string }) {
  if (!products.length) return <div className="empty-state">{emptyMessage || "Товары пока не добавлены. Свяжитесь с нами, чтобы уточнить ассортимент."}</div>;
  return <div className="products-grid">{products.map(product => <ProductCard product={product} key={product.id} />)}</div>;
}

export function HomeHero() {
  const slides = [
    { title: "Ритуальные товары без наценок", text: "Производство и поставка ритуальных товаров. Поможем подобрать необходимое и ответим на вопросы.", img: "/upload/resize_cache/iblock/f1f/760_500_1/t22s2ub31t379guv8ivvwx7r1q4ohzgb.png", href: "/catalog/", cta: "Каталог товаров" },
    { title: "Что делать, если умер близкий?", text: "Расскажем, с чего начать и как организовать необходимые услуги.", img: "/upload/resize_cache/iblock/551/760_500_1/vzr25kfwy4k5ze8jyclwhm3q8tnp088o.png", href: "/company/usloviya-dostavki/", cta: "Подробнее" },
  ];
  const [active, setActive] = useState(0);
  useEffect(() => { const timer = window.setInterval(() => setActive(value => (value + 1) % slides.length), 7000); return () => window.clearInterval(timer); }, [slides.length]);
  return <section className="v-home-banners-wrapper" aria-label="Информация о заводе">
    <div className="v-home-banners hero-grid">
      {slides.map((slide, index) => <article className={`item hero-card ${index === active ? "active" : ""}`} key={slide.title}>
        <div className="bg"><img src={slide.img} alt="" /></div>
        <div className="description"><h1 className="title">{slide.title}</h1><p className="text">{slide.text}</p><Link className="v-btn green" href={slide.href}>{slide.cta}</Link></div>
      </article>)}
    </div>
    <div className="hero-dots" aria-label="Слайды">{slides.map((slide, index) => <button key={slide.title} className={index === active ? "active" : ""} onClick={() => setActive(index)} aria-label={`Слайд ${index + 1}`} aria-pressed={index === active} />)}</div>
  </section>;
}

export function ProductListing({ categories, current, products, total, facets, initialPage = 1, search = false, searchQuery = "" }: {
  categories: Category[]; current?: Category; products: Product[]; total: number; facets?: CatalogFacets; initialPage?: number; search?: boolean; searchQuery?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const rubles = (value: string | null) => value ? String(Number(value) / 100) : "";
  const selectedAttributes = () => Object.fromEntries([...searchParams.entries()].filter(([key]) => key.startsWith("attributes[")).map(([key,value]) => [key.slice(11,-1),value]));
  const [minPrice, setMinPrice] = useState(rubles(searchParams.get("minPrice")));
  const [maxPrice, setMaxPrice] = useState(rubles(searchParams.get("maxPrice")));
  const [attributeFilters, setAttributeFilters] = useState<Record<string,string>>(selectedAttributes);
  const sort = searchParams.get("sort") || "popular";
  const filterNames = useMemo(() => {
    if (facets?.attributes.length) return facets.attributes.map(facet => [facet.key, new Set(facet.values.map(item => item.value))] as const);
    const values = new Map<string, Set<string>>();
    products.forEach(product => Object.entries(product.attributes || {}).forEach(([key,value]) => {
      const list = values.get(key) || new Set<string>(); list.add(value); values.set(key,list);
    }));
    return [...values.entries()].filter(([,items]) => items.size < 12).slice(0,4);
  }, [facets, products]);

  useEffect(() => {
    if (!filtersOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setFiltersOpen(false); };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [filtersOpen]);

  useEffect(() => {
    setMinPrice(rubles(searchParams.get("minPrice")));
    setMaxPrice(rubles(searchParams.get("maxPrice")));
    setAttributeFilters(selectedAttributes());
  }, [searchParams]);

  function navigate(next: Record<string,string>) {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(next).forEach(([key,value]) => value ? params.set(key,value) : params.delete(key));
    params.set("page","1");
    router.push(`${pathname}?${params.toString()}`);
  }
  function navigateFilters(next: Record<string,string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const key of [...params.keys()]) if (key === "minPrice" || key === "maxPrice" || key.startsWith("attributes[")) params.delete(key);
    Object.entries(next).forEach(([key,value]) => value && params.set(key,value));
    params.set("page","1");
    router.push(`${pathname}?${params.toString()}`);
  }
  function submitFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next: Record<string,string> = {};
    if (minPrice) next.minPrice = String(Math.round(Number(minPrice) * 100));
    if (maxPrice) next.maxPrice = String(Math.round(Number(maxPrice) * 100));
    Object.entries(attributeFilters).forEach(([name,value]) => { if (value) next[`attributes[${name}]`] = value; });
    navigateFilters(next); setFiltersOpen(false);
  }
  const heading = search ? "Результаты поиска" : current?.name || "Каталог товаров";
  const childCategories = search ? categories : current ? categories.filter(category => category.parentId === current.id) : categories.filter(category => !category.parentId);
  const priceMin = facets?.minPrice == null ? 0 : facets.minPrice / 100;
  const priceMax = facets?.maxPrice == null ? 100000 : facets.maxPrice / 100;
  const clearFilters = () => {
    setMinPrice(""); setMaxPrice(""); setAttributeFilters({});
    navigateFilters({});
  };
  const desktopFilters = <form className="catalog-facets" onSubmit={submitFilters} aria-label="Фильтры каталога">
    <details className="catalog-facet catalog-price-facet">
      <summary>Цена</summary>
      <div className="catalog-facet-popover">
        <div className="catalog-price-sliders">
          <label>От<input className="field-control" type="number" min={priceMin} max={maxPrice || priceMax} step="0.01" placeholder={String(priceMin)} aria-label="Цена от" value={minPrice} onChange={event => setMinPrice(event.target.value)} /></label>
        <label>До<input className="field-control" type="number" min={0} max={priceMax} step="0.01" placeholder={String(priceMax)} aria-label="Цена до" value={maxPrice} onChange={event => setMaxPrice(event.target.value)} /></label>
        </div>
        <div className="catalog-price-range">
          <input aria-label="Минимальная цена" type="range" min={priceMin} max={priceMax} step="0.01" value={minPrice || priceMin} onChange={event => setMinPrice(event.target.value)} />
          <input aria-label="Максимальная цена" type="range" min={priceMin} max={priceMax} step="0.01" value={maxPrice || priceMax} onChange={event => setMaxPrice(event.target.value)} />
        </div>
        <div className="catalog-facet-actions"><button className="v-btn green" type="submit">Применить</button><button className="v-btn outline" type="button" onClick={clearFilters}>Сбросить</button></div>
      </div>
    </details>
    {filterNames.map(([name,values],index) => <details className="catalog-facet" key={`${name}-${index}`}>
      <summary>{name}</summary><div className="catalog-facet-popover">{(facets?.attributes.find(facet => facet.key === name)?.values ?? [...values].map(value => ({value,count:0}))).map(({value,count}) => <label key={value}><input type="checkbox" checked={attributeFilters[name] === value} onChange={event => setAttributeFilters(old => ({...old,[name]:event.target.checked ? value : ""}))} /> {value}{count > 0 && <span className="facet-count">{count}</span>}</label>)}<div className="catalog-facet-actions"><button className="v-btn green" type="submit">Применить</button><button className="v-btn outline" type="button" onClick={clearFilters}>Сбросить</button></div></div>
    </details>)}
  </form>;
  const sortHref = (value: string) => {
    const params = new URLSearchParams(searchParams.toString()); params.set("sort",value); params.set("page","1");
    return `${pathname}?${params.toString()}`;
  };

  return <div className="catalog-listing-page">
    <div className="catalog-title-band"><div className="catalog-title-inner">
      <Breadcrumbs items={[{name:"Каталог",href:"/catalog/"}, ...(current ? [{name:current.name}] : search ? [{name:"Поиск"}] : [])]} />
      <h1>{heading}</h1>
      {childCategories.length > 0 && <nav className="catalog-subcategories" aria-label="Подкатегории">{childCategories.map(category => <Link href={category.path} key={category.id}>{category.name}</Link>)}</nav>}
    </div></div>
    <div className="page-wrap">
    <section className="catalog-results" aria-label="Товары">
        <div className="catalog-toolbar">
          <button className="v-btn filter-open" type="button" onClick={() => setFiltersOpen(true)} aria-label="Фильтры">Фильтры</button>
          {desktopFilters}
          <nav className="catalog-sort" aria-label="Сортировка">
            <Link aria-current={sort === "popular" ? "true" : undefined} href={sortHref("popular")}>Популярные</Link>
            <Link aria-current={sort === "name" ? "true" : undefined} href={sortHref("name")}>По названию</Link>
            <Link aria-current={sort.startsWith("price") ? "true" : undefined} href={sortHref(sort === "price_asc" ? "price_desc" : "price_asc")}>По цене</Link>
          </nav>
        </div>
        <ProductGrid products={products} emptyMessage={search && searchQuery ? `По запросу «${searchQuery}» товары не найдены.` : undefined} />
        {total > products.length && <div className="pagination"><button className="v-btn outline" disabled={initialPage <= 1} onClick={() => navigate({page:String(initialPage - 1)})}>Назад</button><span>Страница {initialPage}</span><button className="v-btn outline" onClick={() => navigate({page:String(initialPage + 1)})}>Дальше</button></div>}
      </section>
    </div>
    {filtersOpen && <div className="mobile-filter-panel" role="dialog" aria-modal="true" aria-label="Фильтры каталога" data-testid="mobile-filter-panel">
      <div className="panel-header"><h2>Фильтры</h2><button className="panel-close" aria-label="Закрыть фильтры" onClick={() => setFiltersOpen(false)}>×</button></div>
      <form className="mobile-filter-form" onSubmit={submitFilters}>
        <div className="mobile-facet-group"><h3>Цена</h3><div className="mobile-facet-content">
          <div className="catalog-price-sliders"><label>От<input className="field-control" type="number" min={priceMin} max={maxPrice || priceMax} step="0.01" placeholder={String(priceMin)} aria-label="Цена от" value={minPrice} onChange={event => setMinPrice(event.target.value)} /></label><label>До<input className="field-control" type="number" min={0} max={priceMax} step="0.01" placeholder={String(priceMax)} aria-label="Цена до" value={maxPrice} onChange={event => setMaxPrice(event.target.value)} /></label></div>
          <div className="catalog-price-range"><input aria-label="Минимальная цена" type="range" min={priceMin} max={priceMax} step="0.01" value={minPrice || priceMin} onChange={event => setMinPrice(event.target.value)} /><input aria-label="Максимальная цена" type="range" min={priceMin} max={priceMax} step="0.01" value={maxPrice || priceMax} onChange={event => setMaxPrice(event.target.value)} /></div>
        </div></div>
        {filterNames.map(([name,values],index) => {
          const entries = facets?.attributes.find(facet => facet.key === name)?.values ?? [...values].map(value => ({value,count:0}));
          return <fieldset className="mobile-facet-group" key={`${name}-${index}`}><legend>{name}</legend><div className="mobile-facet-content">{entries.map(({value,count}) => <label key={value}><input type="checkbox" checked={attributeFilters[name] === value} onChange={event => setAttributeFilters(old => ({...old,[name]:event.target.checked ? value : ""}))} /> {value}{count > 0 && <span className="facet-count">{count}</span>}</label>)}</div></fieldset>;
        })}
        <div className="mobile-filter-actions"><button className="v-btn green" type="submit">Показать ({total})</button><button className="v-btn outline" type="button" onClick={clearFilters}>Сбросить</button></div>
      </form>
    </div>}
  </div>;
}
