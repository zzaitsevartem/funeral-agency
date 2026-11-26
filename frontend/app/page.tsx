import Link from "next/link";
import { getProducts } from "@/lib/catalog";
import { referenceCategories } from "@/lib/catalog-shared";
import { HomeHero, HomePackages } from "@/components/site-shell";
import { ProductCard } from "@/components/storefront";

export const dynamic = "force-dynamic";

const stories = [
  ["Как организовать похороны самостоятельно", "/upload/resize_cache/iblock/dba/200_200_1/pb3bg4hjog4qdfix0ncm0ojwziqjqea7.webp"],
  ["Необходимый комплект товаров для похорон", "/upload/resize_cache/iblock/f92/200_200_1/ntjgweuf7ot4by6wrhihrgbnzwqn24pu.webp"],
  ["Остерегайтесь мошенников", "/upload/resize_cache/iblock/687/200_200_1/h3q9xdzmnyw5t9wdlvd03g80byazef1w.webp"],
  ["Пособия от государства", "/upload/resize_cache/iblock/5e5/200_200_1/pow23yn31v3ub502u4nxny0p7ewzuy3h.webp"],
  ["Перевозка усопшего в другой город", "/upload/resize_cache/iblock/934/200_200_1/hn9e3ji1h2kaj7pdd4ftlzftr8xzcf9p.webp"],
] as const;

const mission = [
  ["Мы понимаем, как сложно делать выбор в момент утраты.", "/upload/iblock/ddb/ixutbo4b5xdh9f5c6nt55v5n4h61fewn.svg"],
  ["Мы подскажем, как работает ритуальная услуга и ответим на все возникшие вопросы.", "/upload/iblock/06a/41sn9tjxs74iu720xp9r6jrc3mx1kp4j.svg"],
  ["Для нас важно не только предоставить качественные услуги, но и сделать процесс максимально понятным.", "/upload/iblock/8ae/x3rn8bqp2e2jqt4jonb7jfaq8m98d1lv.svg"],
  ["Мы рядом, чтобы сохранить тепло памяти с достоинством и уважением.", "/upload/iblock/760/sk5lh5i0yrjc2vq9ar1b96x1okfw5lfk.svg"],
] as const;

const homeCategories = [
  ["groby_derevyannye", "Гробы деревянные"], ["venki_ritualnye", "Венки ритуальные"],
  ["kresty_na_mogilu", "Кресты надгробные"], ["tekstil_v_grob", "Текстиль в гроб"],
  ["odezhda_ritualnaya", "Одежда ритуальная"], ["urny_dlya_prakha_", "Урны"],
].map(([slug, title]) => ({ ...referenceCategories.find(category => category.slug === slug)!, title }));

export default async function HomePage() {
  const productList = await getProducts({ sort: "popular", limit: 100 });
  const productSections = [
    ["venki_ritualnye", "Венки ритуальные"], ["groby_derevyannye", "Гробы"], ["kresty_na_mogilu", "Кресты на могилу"],
  ].map(([slug, title]) => {
    const category = referenceCategories.find(item => item.slug === slug)!;
    return { slug, title, products: productList.items.filter(product => product.categoryId === category.id).slice(0, 20) };
  });
  const section = (slug: string) => productSections.find(item => item.slug === slug);
  const productRail = (slug: string) => {
    const item = section(slug);
    return item && <section className="home-product-section" key={slug}>
      <div className="v-container"><div className="home-product-heading"><h2 className="vi-h2">{item.title}</h2></div>
        <div className="home-product-rail">{item.products.map(product => <ProductCard key={product.id} product={product} />)}</div>
        <Link className="in-catalog-btn" href={`/catalog/${item.slug}/`}>В каталог</Link>
      </div>
    </section>;
  };

  return <div className="home-page">
    <HomeHero />

    <div className="home-stories v-container" aria-label="Полезная информация">
      {stories.map(([title, image]) => <Link className="home-story" href="/company/news/" key={title}>
        <span className="home-story-image"><img src={image} alt="" /></span><span>{title}</span>
      </Link>)}
    </div>

    <section className="home-categories v-container">
      <h1 className="vi-h2">Ритуальные товары от производителя</h1>
      <div className="home-category-rail">
        {homeCategories.map(category => <Link className="home-category" href={category.path} key={category.id}>
          <span className="name">{category.title}</span>{category.image && <img src={category.image} alt={category.title} />}
        </Link>)}
      </div>
    </section>

    <section className="home-mission v-container">
      <h2 className="vi-h2">Наша миссия заключается в помощи</h2>
      <div className="home-mission-grid">{mission.map(([text, icon]) => <article className="home-mission-item" key={text}>
        <img src={icon} alt="" loading="lazy" /><p>{text}</p>
      </article>)}</div>
    </section>

    {productRail("venki_ritualnye")}

    <section className="home-help v-container">
      <h2 className="vi-h2">Честная помощь с организацией и документами</h2>
      <p className="home-help-intro">Помогаем, а не хитрим. Мы берём на себя организацию похорон, чтобы вы могли сосредоточиться на самом важном — прощании с близким.</p>
      <div className="home-help-cards">
        <article className="home-help-card"><h3>Документы</h3><p>Для самостоятельного сбора документов</p><ol><li>эпикриз</li><li>история болезни усопшего</li><li>справка о смерти</li><li>свидетельство о смерти</li></ol><p>Если у вас возникли трудности со сбором документов, то вы можете обратиться в справочную службу завода «ФАВОРИТ» 8 925 856 17 79, а также при необходимости, заказать услугу сбора документов.</p></article>
        <article className="home-help-card"><h3>Транспортные услуги</h3><ol><li>Доставка принадлежностей в морг</li><li>Предоставление катафального транспорта для доставки гроба с телом в церковь, на кладбище или крематорий</li><li>Перевозка усопшего в другой город (груз 200)</li></ol></article>
        <article className="home-help-card"><h3>Консультация</h3><ol><li>Бесплатная консультация специалиста по вопросам организации похорон и формирования полного комплекта необходимых ритуальных товаров и услуг.</li></ol><div className="home-help-phones"><a href="tel:+79252115986">8 925 2115986</a><a href="tel:+79258561779">8 925 856 17 79</a></div></article>
      </div>
      <Link className="home-help-contact" href="/contacts/">Связаться с нами</Link>
    </section>

    {productRail("groby_derevyannye")}
    <HomePackages />
    {productRail("kresty_na_mogilu")}

    <section className="home-assistance-banner v-container">
      <article><h2>Справочная служба</h2><p>Бесплатная консультация специалиста по вопросам формирования полного комплекта необходимых ритуальных товаров и услуг с доставкой в Москве.</p><div><a href="tel:+79252115986">8 925 2115986</a><a href="tel:+79258561779">8 925 856 17 79</a></div></article>
      <article><h2>Федеральный Закон «О погребении и похоронном деле»</h2><p>Деятельность осуществляется на основании Федерального закона от 12.01.1996 г. №8-ФЗ «О погребении и похоронном деле»</p></article>
    </section>

    <section className="home-blog-wrapper v-container">
      <h2 className="vi-h2">Помогаем вам разобраться в сложных вопросах</h2>
      <p>Мы пишем об организации похорон, ритуальных традициях и внутренней жизни ритуального производства. Читайте наш блог, чтобы узнать больше об этой важной части жизни.</p>
      <div className="home-blog-grid">
        <Link className="home-blog-feature" href="/company/news/tovary/chto-vkhodit-v-namogilnyy-komplekt/"><span>Что входит в намогильный комплект и какие расходы согласовать отдельно<small>Товары</small></span><img src="/upload/resize_cache/sprint.editor/77f/1400_1280_1/j0yp39gplcs5tsa3r72w520y4784d8d0.webp" alt="" /></Link>
        <div className="home-blog-secondary">
          <Link href="/company/news/tovary/kak-perevezti-venok-v-kholodnuyu-pogodu/"><span>Как перевезти венок в холодную погоду: упаковка, маршрут и передача<small>Товары</small></span><img src="/upload/resize_cache/sprint.editor/4ba/1000_700_1/b58u6h977xok5i96k1sg0zconxyoh011.webp" alt="" /></Link>
          <Link href="/company/news/tovary/postel-podushka-pokryvalo-k-modeli-groba/"><span>Как подобрать постель, подушку и покрывало к конкретной модели гроба<small>Товары</small></span><img src="/upload/resize_cache/sprint.editor/712/1000_700_1/9o6xosmg8jtk6vaiijsj34qp00gy1uma.webp" alt="" /></Link>
        </div>
      </div>
      <Link className="home-blog-all" href="/company/news/">Все публикации</Link>
    </section>

    <section className="home-social v-container">
      <div className="home-social-description"><h2>Следите за нами в соцсетях</h2><p>В наших соцсетях вы найдёте краш-тест гроба, полёт над территорией завода, видеообзоры изделий. Присоединяйтесь, чтобы убедиться: здесь люди работают для людей.</p></div>
      <div className="home-social-links">
        <a href="https://t.me/zavod_favorit" aria-label="Telegram"><svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="50" fill="#2aabee"/><path d="M22 48 72 29c3-1 5 0 4 4L67 72c-1 4-3 5-6 3L46 64l-8 8c-1 1-2 1-2 0l2-15 29-26-36 22-14-5c-4-1-4-3 1-5Z" fill="#fff"/></svg></a>
        <a href="https://vk.com/zavod_favorit" aria-label="ВКонтакте"><svg viewBox="0 0 100 100" aria-hidden="true"><rect width="100" height="100" rx="22" fill="#07f"/><path fill="#fff" d="M18 33h14c1 18 8 26 13 28V33h13v15c5-.5 11-8 13-15h13c-2 11-9 19-14 22 5 2 13 9 16 22H72c-3-9-8-14-14-15v15H53C32 77 20 62 18 33Z"/></svg></a>
        <a href="https://dzen.ru/zavod_favorit" aria-label="Дзен"><svg viewBox="0 0 100 100" aria-hidden="true"><rect width="100" height="100" rx="24" fill="#25282c"/><path fill="#fff" d="M50 12c-1 22-5 37-38 38 22 1 37 5 38 38 1-22 5-37 38-38-22-1-37-5-38-38Z"/></svg></a>
      </div>
    </section>

    <section className="home-product-banner v-container">
      <img src="/upload/resize_cache/statikfile/362/bfd/300_200_1/enyrxd6zuwb25ff86jy5101kf6jh4yye.webp" alt="" />
      <div><span className="home-product-tag">Серия Италия</span><h2>Премиальный гроб Версаче</h2><p>Калиброванный массив сосны — на дереве нет сучков и обзолов. Внутри — атласная постель с выворотом и подушка. Доступен к заказу прямо сейчас.</p></div>
      <Link href="/catalog/groby_derevyannye/groby_lakirovannye/seriya_italiya_1/grob_versache_/">Подробнее</Link>
    </section>
  </div>;
}
