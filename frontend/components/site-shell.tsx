"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { formatPrice, referenceCategories, type Category, type Product } from "@/lib/catalog-shared";

const topLinks = [
  ["Каталог", "/catalog/"],
  ["О заводе", "/company/"], ["Доставка и оплата", "/company/usloviya-dostavki/"],
  ["Публикации", "/company/news/"], ["Контакты", "/contacts/"], ["Партнеры", "/partners/"],
  ["СМИ о нас", "/press/"], ["Вакансии", "/company/vakansii/"],
];

const heroSlides = [
  {
    title: "Гарантия заводского качества",
    text: "Вся производимая продукция завода «Фаворит» имеет сертификаты соответствия по нормативам Российской Федерации.",
    video: "/upload/iblock/a56/2odtlvr5wluog4624sugnovs2sz8r26z.mp4",
    image: "/upload/resize_cache/iblock/0d9/760_500_1/3f12op1wq43tucdv93owtz5j1fc7oynx.webp",
    href: "/catalog/", cta: "Посмотреть каталог",
  },
  {
    title: "Ритуальные товары без наценок",
    text: "Заказывайте все необходимое для организации похорон на заводе «Фаворит» без посредников с доставкой от одной единицы.",
    image: "/upload/resize_cache/iblock/f1f/760_500_1/t22s2ub31t379guv8ivvwx7r1q4ohzgb.png",
    href: "/catalog/", cta: "Перейти к каталогу",
  },
  {
    title: "Что делать, если умер близкий?",
    text: "Необходимая информация и четкий порядок действий в случае смерти близкого человека.",
    image: "/upload/resize_cache/iblock/551/760_500_1/vzr25kfwy4k5ze8jyclwhm3q8tnp088o.png",
    href: "/contacts/", cta: "Получить консультацию",
  },
];

export function HomeHero() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) return;
    const timer = window.setInterval(() => setActive(value => (value + 1) % heroSlides.length), 7000);
    return () => window.clearInterval(timer);
  }, []);

  return <section className="v-home-banners-wrapper" aria-label="Информация о заводе">
    <div className="v-container">
      <div className="swiper not-loader v-home-banners">
        <div className="swiper-wrapper" style={{ transform: `translateX(calc(var(--home-slide-step, 0px) * ${active} * -1))` }}>
          {heroSlides.map((slide, index) => <article className={`swiper-slide item home-hero-slide ${slide.video ? "with-video" : ""} ${active === index ? "active" : ""}`} key={slide.title} aria-hidden={active !== index}>
            <div className="description"><h1 className="title">{slide.title}</h1><p className="text">{slide.text}</p><Link className="v-btn outline big white" href={slide.href}>{slide.cta}</Link></div>
            <div className="bg">{slide.video ? <video muted playsInline autoPlay loop poster={slide.image} preload="none" src={slide.video} /> : <img src={slide.image} alt={slide.title} loading={index === 0 ? "eager" : "lazy"} />}</div>
          </article>)}
        </div>
        <div className="swiper-pagination" aria-label="Слайды">
          {heroSlides.map((slide, index) => <button type="button" key={slide.title} aria-label={`Слайд ${index + 1}`} aria-pressed={active === index} className={active === index ? "active" : ""} onClick={() => setActive(index)} />)}
        </div>
      </div>
    </div>
  </section>;
}

function CatalogLinks({ categories, close }: { categories: Category[]; close: () => void }) {
  const rootSlugs = new Set(referenceCategories.map(category => category.slug));
  const visibleRoots = categories.filter(category => !category.parentId && rootSlugs.has(category.slug)).sort((a, b) => {
    const left = referenceCategories.findIndex(item => item.slug === a.slug);
    const right = referenceCategories.findIndex(item => item.slug === b.slug);
    return left - right;
  });
  const visibleIds = new Set(visibleRoots.map(category => category.id));
  const visibleCategories = categories.filter(category => visibleIds.has(category.id) || (category.parentId && visibleIds.has(category.parentId)));
  return <div className="v-menu-wrapper">
    <button className="v-close-catalog-menu-btn" onClick={close} aria-label="Закрыть меню"><span className="name">Каталог товаров</span><span aria-hidden="true">×</span></button>
    <ul className="catalog-root-list" id="catalog-menu-desktop">
      {visibleRoots.map(category => <li key={category.id} className={category.slug === "venki_ritualnye" ? "max" : ""}>
        <Link className="toggle-sub-menu" href={category.path} onClick={close}>{category.name}</Link>
        {visibleCategories.some(child => child.parentId === category.id) && <ul>
          {visibleCategories.filter(child => child.parentId === category.id).map(child => <li key={child.id}><Link href={child.path} onClick={close}>{child.name}</Link></li>)}
        </ul>}
      </li>)}
    </ul>
    <div className="top-menu">{topLinks.map(([name, href]) => <Link key={href} href={href} onClick={close}>{name}</Link>)}</div>
  </div>;
}

function CityPin() {
  return <svg className="city-pin" width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
    <path d="M9 16s5.25-5.04 5.25-9A5.25 5.25 0 0 0 3.75 7c0 3.96 5.25 9 5.25 9Z" stroke="currentColor" strokeWidth="1.2" />
    <circle cx="9" cy="7" r="1.75" stroke="currentColor" strokeWidth="1.2" />
  </svg>;
}

export function SiteHeader() {
  const [categories, setCategories] = useState(referenceCategories);
  const [cartCount, setCartCount] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [city, setCity] = useState("Москва");

  useEffect(() => {
    if (["/search", "/search/"].includes(window.location.pathname)) {
      setQuery(new URLSearchParams(window.location.search).get("q") ?? "");
    }
    fetch("/api/catalog/categories").then(r => r.ok ? r.json() : null).then(data => data?.items?.length && setCategories(data.items.filter((category: Category) => !category.parentId ? referenceCategories.some(item => item.slug === category.slug) : true))).catch(() => {});
    fetch("/api/cart").then(r => r.ok ? r.json() : null).then(data => setCartCount(data?.count ?? 0)).catch(() => {});
    const update = (event: Event) => setCartCount(Number((event as CustomEvent<number>).detail) || 0);
    window.addEventListener("favorit:cart", update);
    return () => window.removeEventListener("favorit:cart", update);
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setSuggestions([]);
      setSuggestionsOpen(false);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      fetch(`/api/catalog/products?q=${encodeURIComponent(q)}&limit=6&sort=name`, { signal: controller.signal })
        .then(response => response.ok ? response.json() : null)
        .then(data => {
          if (!controller.signal.aborted) {
            setSuggestions(Array.isArray(data?.items) ? data.items : []);
            setSuggestionsOpen(true);
          }
        })
        .catch(() => {});
    }, 180);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  function toggleMenu() {
    setMenuOpen(value => {
      const open = !value;
      document.body.classList.toggle("mobile-top-menu-open", open && window.innerWidth < 1025);
      document.body.classList.toggle("desktop-menu-open", open && window.innerWidth >= 1025);
      return open;
    });
  }

  function closeMenu() {
    setMenuOpen(false);
    document.body.classList.remove("mobile-top-menu-open", "desktop-menu-open");
  }

  useEffect(() => {
    if (!menuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        document.body.classList.remove("mobile-top-menu-open", "desktop-menu-open");
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [menuOpen]);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (query.trim()) window.location.href = `/search/?q=${encodeURIComponent(query.trim())}`;
  }

  return <>
    <header className="v-header">
      <div className="v-container top">
        <a className="phone" href="tel:+74951518474">8 495 151 84 74</a>
        <div className="desktop-menu">{topLinks.map(([name, href]) => <Link href={href} key={href}>{name}</Link>)}</div>
        <button className="v-close-menu" onClick={toggleMenu} aria-label={menuOpen ? "Закрыть меню" : "Открыть меню"}>Меню</button>
      </div>
      <div className="v-container bottom">
        <button className="v-open-catalog-menu-btn-mobile" onClick={toggleMenu} aria-label="Открыть меню каталога">
          <svg width="44" height="44" viewBox="0 0 44 44" fill="none" aria-hidden="true"><path d="M12 16L32 16M12 22H26M12 28H32" stroke="#496C2E" strokeWidth="1.2" strokeLinecap="round" /></svg>
        </button>
        <Link href="/" className="logo" aria-label="Завод Фаворит — на главную"><img src="/local/templates/FAVORITE_LK/assets/svg/logo_n.svg" alt="Завод Фаворит" width="200" height="50" /></Link>
        <div className="v-city-selection-wrapper" aria-label="Город доставки">
          <button className={city === "Москва" ? "item active" : "item"} onClick={() => setCity("Москва")}><CityPin />Москва</button>
          <button className={city === "Санкт-Петербург" ? "item active" : "item"} onClick={() => setCity("Санкт-Петербург")}><CityPin />Санкт-Петербург</button>
        </div>
        <button className="v-btn v-open-catalog-menu-btn-desktop" onClick={toggleMenu}>
          <svg className="icon" width="25" height="24" viewBox="0 0 25 24" fill="none" aria-hidden="true"><path d="M11 4.5H5V10.5H11V4.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/><path d="M20 4.5H14V10.5H20V4.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/><path d="M11 13.5H5V19.5H11V13.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/><path d="M20 13.5H14V19.5H20V13.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          каталог
        </button>
        <div className={`v-header-search ${searchOpen ? "search-active" : ""}`}>
          <button className="v-open-header-search-btn" onClick={() => setSearchOpen(value => !value)} aria-label="Открыть поиск">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M10.875 18.75C15.2242 18.75 18.75 15.2242 18.75 10.875C18.75 6.52576 15.2242 3 10.875 3C6.52576 3 3 6.52576 3 10.875C3 15.2242 6.52576 18.75 10.875 18.75Z" stroke="#496C2E" strokeWidth="1.5" strokeLinecap="round"/><path d="M16.4438 16.4438L21.0001 21.0001" stroke="#496C2E" strokeWidth="1.5" strokeLinecap="square"/></svg>
          </button>
          <form className="v-search-input-block" onSubmit={submitSearch} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setSuggestionsOpen(false); }}>
            <button type="submit" className="search-icon-desktop" aria-label="Найти"><svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M9.0625 15.625C12.6869 15.625 15.625 12.6869 15.625 9.0625C15.625 5.43813 12.6869 2.5 9.0625 2.5C5.43813 2.5 2.5 5.43813 2.5 9.0625C2.5 12.6869 5.43813 15.625 9.0625 15.625Z" stroke="#242623" strokeWidth="1.5" strokeLinecap="round"/><path d="M13.7031 13.7031L17.5 17.5" stroke="#242623" strokeWidth="1.5"/></svg></button>
            <input value={query} onFocus={() => suggestions.length && setSuggestionsOpen(true)} onChange={event => { setQuery(event.target.value); setSuggestionsOpen(true); }} type="search" className="v-header-search-input-field" aria-label="Поиск по каталогу" aria-autocomplete="list" aria-controls="catalog-search-suggestions" aria-expanded={suggestionsOpen && suggestions.length > 0} placeholder="Поиск" />
            {suggestionsOpen && suggestions.length > 0 && <div className="catalog-search-suggestions" id="catalog-search-suggestions" role="listbox" aria-label="Подходящие товары">
              {suggestions.map(product => <Link key={product.id} role="option" aria-selected="false" href={product.path} className="catalog-search-suggestion" onClick={() => setSuggestionsOpen(false)}>
                {product.images?.[0] && <img src={product.images[0]} alt="" />}
                <span className="catalog-search-suggestion-name">{product.name}</span>
                <span className="catalog-search-suggestion-price">{formatPrice(product.price)}</span>
              </Link>)}
              <button type="submit" className="catalog-search-all">Все результаты по запросу «{query.trim()}»</button>
            </div>}
          </form>
          <button className="v-close-mobile-search" onClick={() => setSearchOpen(false)}>отмена</button>
        </div>
        <Link href="/personal/cart/" className="v-header-basket-wrapper" aria-label={`Корзина, товаров: ${cartCount}`}>
          <span className="icon-wrapper"><svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M21 6H27C27.5523 6 28 6.44772 28 7V25C28 25.5523 27.5523 26 27 26H5C4.44772 26 4 25.5523 4 25V7C4 6.44772 4.44772 6 5 6H16" stroke="#496C2E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M12 10V5C12 2.79086 13.7909 1 16 1C18.2091 1 20 2.79086 20 5V10" stroke="#496C2E" strokeWidth="1.5" strokeLinecap="round"/></svg><span className="basket-count">{cartCount}</span></span>
          <span className="name">Корзина</span>
        </Link>
      </div>
    </header>
    <div className="v-mobile-header-meta">
        <div className="v-mobile-cities" aria-label="Город доставки">
          <button className={city === "Москва" ? "active" : ""} onClick={() => setCity("Москва")}><CityPin />Москва</button>
          <button className={city === "Санкт-Петербург" ? "active" : ""} onClick={() => setCity("Санкт-Петербург")}><CityPin />Санкт-Петербург</button>
        </div>
        <div className="v-mobile-phones"><a href="tel:+74951518474"><span>МСК:</span> <b>8 495 1518474</b></a><a href="tel:+78122090791"><span>СПБ:</span> <b>8 812 2090791</b></a></div>
    </div>
    <div className={`v-header-catalog-menu-wrapper desktop ${menuOpen ? "menu-is-open" : ""}`}>
      <CatalogLinks categories={categories} close={closeMenu} />
    </div>
    <div className={`v-header-mobile-menu ${menuOpen ? "menu-is-open" : ""}`} aria-hidden={!menuOpen}>
      <button className="v-header-mobile-menu-close" onClick={closeMenu} aria-label="Закрыть меню" aria-hidden="true">×</button>
      <nav aria-label="Навигация сайта">{topLinks.map(([name, href]) => <Link href={href} key={href} onClick={closeMenu}>{name}</Link>)}</nav>
    </div>
  </>;
}

const servicePackages = {
  cremation: [
    { name: "Комплект 1", description: "Самое необходимое количество товаров для похорон", oldPrice: "16 300 ₽", price: "15 500 ₽", items: ["Гроб «Гладь» шелк", "Подушка шелк", "Покрывало тюль", "Перевозка", "Доставка предметов ритуала"] },
    { name: "Комплект 2", description: "Оптимальный набор товаров, требуемых для погребения", oldPrice: "24 450 ₽", price: "23 300 ₽", items: ["Гроб «Комбинированный» (ФКЭ-4)", "Гирлянда вокруг головы", "Комплект атласный: подушка и покрывало", "Перевозка", "Доставка"] },
    { name: "Комплект 3", description: "Полный набор ритуальных товаров для проведения церемоний", oldPrice: "32 900 ₽", price: "31 300 ₽", items: ["Гроб деревянный «Стандарт» (ФС-4)", "Фларетка из цветов на гроб «Стандарт»", "Комплект стеганый: пастель, покрывало, подушка", "Перевозка", "Доставка"] },
    { name: "Комплект 4", description: "Расширенный набор товаров, подчеркивающий высокий статус", oldPrice: "67 300 ₽", price: "63 950 ₽", items: ["Гроб двухкрышечный «Даллас» (ФДЛ-2)", "Комплект парчовый", "Подушка шелковая", "Фларетка «Элит»", "Перевозка", "Доставка"] },
  ],
  burial: [
    { name: "Комплект 1", description: "Самое необходимое количество товаров для похорон", oldPrice: "21 490 ₽", price: "20 500 ₽", items: ["Гроб «Продольное гофре»", "Покрывало тюль", "Подушка шелк", "Крест металл №1", "Табличка на крест", "Венок 90 см", "Лента", "Перевозка"] },
    { name: "Комплект 2", description: "Оптимальный набор товаров, требуемых для погребения", oldPrice: "35 520 ₽", price: "33 750 ₽", items: ["Гроб «Комбинированный» (ФК-4)", "Комплект: подушка атлас, покрывало (пр-016)", "Крест металл №5", "Табличка на крест", "Венок 110 см", "Лента"] },
    { name: "Комплект 3", description: "Полный набор ритуальных товаров для проведения церемоний", oldPrice: "43 120 ₽", price: "41 000 ₽", items: ["Гроб «Классика»", "Комплект стеганый: пастель, покрывало, подушка", "Крест сосна «Стандарт»", "Табличка на крест", "Венок 120 см", "Лента"] },
    { name: "Комплект 4", description: "Расширенный набор товаров, подчеркивающий высокий статус", oldPrice: "98 920 ₽", price: "94 000 ₽", items: ["Гроб двухкрышечный «Вегас»", "Комплект парчовый", "Подушка шелковая", "Крест сосна «Фигурный»", "Табличка на крест", "Венок «Элит» 120 см", "Лента", "Корзина плетеная"] },
  ],
} as const;

export function HomePackages() {
  const [active, setActive] = useState<keyof typeof servicePackages>("cremation");
  return <section id="v-service-block" className="home-packages v-container">
    <h2 className="vi-h2">Пакеты услуг</h2>
    <p className="home-package-intro">Мы готовы обсудить ваши пожелания и предложить подходящий вариант.</p>
    <div className="home-package-tabs" role="tablist" aria-label="Пакеты услуг">
      <button type="button" role="tab" aria-selected={active === "cremation"} className={active === "cremation" ? "active" : ""} onClick={() => setActive("cremation")}>Кремация</button>
      <button type="button" role="tab" aria-selected={active === "burial"} className={active === "burial" ? "active" : ""} onClick={() => setActive("burial")}>Захоронение</button>
    </div>
    <p className="home-package-note">* Согласно ст. 10 закона № 8-ФЗ «О погребении и похоронном деле», компенсация положена родственнику, законному представителю или любому другому человеку, который оплатил похороны умершего.</p>
    <div className="home-package-grid">{servicePackages[active].map((item, index) => <article className={`home-package-card ${index === 1 ? "optimal" : ""}`} key={item.name}>
      <h3>{item.name}</h3><p>{item.description}</p><div className="home-package-price"><del>{item.oldPrice}</del><strong>{item.price}</strong></div>
      <Link className="home-package-cta" href="/contacts/">Узнать больше</Link>
      <ul>{item.items.slice(0, 4).map(value => <li key={value}>{value}</li>)}</ul>
      {item.items.length > 4 && <details><summary>Показать больше</summary><ul>{item.items.slice(4).map(value => <li key={value}>{value}</li>)}</ul></details>}
    </article>)}</div>
  </section>;
}

export function SiteFooter() {
  return <footer className="site-footer source-footer">
    <div className="source-footer-inner">
      <nav className="v-footer-menu" aria-label="Ссылки сайта">{topLinks.slice(0,5).map(([name, href]) => <Link href={href} key={href}>{name}</Link>)}</nav>
      <div className="v-footer-contacts">
        <div className="phone-link"><a href="tel:+79252115986">8 925 2115986</a></div>
        <div className="phone-link"><a href="tel:+79258561779">8 925 856 17 79</a></div>
        <div className="email-link"><a href="mailto:favorit.zakaz@bk.ru">favorit.zakaz@bk.ru</a></div>
        <div className="footer-city">Москва · Санкт-Петербург</div>
        <div className="social">
          <a href="https://t.me/zavod_favorit" aria-label="Telegram"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 11 17-7-4 17-5-5-3 3v-6l9-7-12 6-4-1Z"/></svg></a>
          <a href="https://vk.com/zavod_favorit" aria-label="ВКонтакте"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7h4c.2 5 2 7 3.5 7V7H14v4c1.4-.2 3-2 3.7-4H22c-.6 3-2.3 5.2-4 6.2 1.8.8 3.4 2.8 4 5.8h-4.4c-.6-2.2-2-3.7-3.6-4v4H12C6.5 19 3.4 14.5 3 7Z"/></svg></a>
          <a href="https://dzen.ru/zavod_favorit" aria-label="Дзен"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2c-.2 5.4-1.2 8.8-9 9 .2 1 .2 1.3 0 2 5.4.2 8.8 1.2 9 9 1-.2 1.3-.2 2 0 .2-5.4 1.2-8.8 9-9-.2-1-.2-1.3 0-2-5.4-.2-8.8-1.2-9-9-1 .2-1.3.2-2 0Z"/></svg></a>
        </div>
      </div>
      <div className="v-footer-links"><span className="copy">© 2026, «Фаворит-ритуал»</span><Link href="/usloviya-soglasheniya/">Условия соглашения</Link><Link href="/politika-bezopasnosti/">Политика безопасности</Link><span className="dev">Сделано в Вилке</span></div>
    </div>
  </footer>;
}

export function CookieNotice() {
  const [visible, setVisible] = useState(false);
  useEffect(() => setVisible(localStorage.getItem("cookieConsent") !== "true"), []);
  if (!visible) return null;
  return <aside className="cookie-consent"><span>Мы используем <Link href="/politika-bezopasnosti/">cookies</Link> для улучшения работы сайта.</span><button onClick={() => { localStorage.setItem("cookieConsent", "true"); setVisible(false); }}>Согласен</button></aside>;
}
