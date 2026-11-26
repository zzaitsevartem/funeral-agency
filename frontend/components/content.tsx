import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/storefront";
import { ContactForm } from "@/components/contact-form";
import { ContentTitleBand } from "@/components/page-title";
import referencePages from "@/data/reference-pages.json";
import newsCards from "@/data/news-cards.json";
import type { PublishedPage } from "@/lib/catalog";

type Section = { heading?: string; body: string };
type Page = { title: string; sections: Section[] };

const pages: Record<string, Page> = {
  company: { title: "О заводе", sections: [{ heading: "«Фаворит - ритуал»", body: "Мы являемся самым крупным производителем ритуальных товаров.\n8 ГА территория завода, 15 000 м2 производственных помещений.\nУ нас самый широкий ассортимент, более 100 наименований гробов и крестов, а также огромный выбор венков.\n\nСотрудники завода прекрасно понимают что ритуальные товары - нечто большее, чем продукция. Что это возможность родственников выразить уважение к усопшим, достойно проводив их в последний путь.\n\nЗавод \"Фаворит\" не просто качественно выполняет свою работу, но и старается быть частью глобальных изменений, участвуя в развитии культуры и общества.\n\nЦель завода, сделать ритуальную сферу открытой и понятной для всех, и поэтому обеспечиваем прозрачность каждого шага." }, { heading: "Наши ценности", body: "Человечность\nВ основе нашей работы лежат теплота, забота, сочувствие и стремление принести пользу людям. Мы стремимся к гармонии, мудрости и трансформации отрасли, вдохновляя наших партнёров быть хранителям традиций, которые вносят свой вклад в развитие ритуальной культуры.\n\nКомпетентность\nМы гордимся тем, что можем предложить нашим партнёрам высококачественную продукцию и безупречный сервис. Наши знания, опыт и подход к работе делают нас надёжными партнёрами, которым можно доверять.\n\nПреемственность\nНа производстве ремесло передаётся новым поколениям, продолжая традиции и создавая новые стандарты в ритуальной отрасли. Мы верим в важность наставничества и развития сотрудников." }] },
  "usloviya-dostavki": { title: "Доставка и оплата", sections: [{ body: "Товар можно забрать самовывозом или заказать доставку курьерской службой." }] },
  "usloviya-oplaty": { title: "Условия оплаты", sections: [{ body: "Оплата производится при получении заказа. Доступные способы оплаты отображаются при оформлении заказа." }] },
  contacts: { title: "Контакты", sections: [{ heading: "Контакты", body: "«Фаворит Ритуал» — крупнейший производитель и поставщик ритуальных товаров.\n\nИнновационный пр., 14, промзона Технопарк, рабочий посёлок Горки Ленинские\n\n8 495 1518474\nfavorit.zakaz@bk.ru\n\nПн-Вс: 08:00-20:00\nБез выходных" }, { heading: "Остались вопросы?", body: "Позвоните и мы ответим на все ваши вопросы по номеру:\n\n8 495 1518474" }, { heading: "Федеральный Закон «О погребении и похоронном деле»", body: "Деятельность осуществляется на основании\nФедерального закона от 12.01.1996 г.\n№8-ФЗ «О погребении и похоронном деле»" }] },
  partners: { title: "Партнеры", sections: [{ body: "По вопросам сотрудничества свяжитесь с нами по телефону 8 925 211 59 86 или по адресу favorit.zakaz@bk.ru." }] },
  press: { title: "СМИ о нас", sections: [{ body: "По вопросам публикаций и комментариев свяжитесь с заводом «Фаворит»." }] },
  vakansii: { title: "Вакансии", sections: [{ body: "По вопросам работы и актуальных вакансий свяжитесь с нами по телефону 8 925 211 59 86 или по адресу favorit.zakaz@bk.ru." }] },
  news: { title: "Публикации", sections: [] },
};

const pathForSlug: Record<string, string> = { company: "/company/", "usloviya-dostavki": "/company/usloviya-dostavki/", "usloviya-oplaty": "/company/usloviya-oplaty/", news: "/company/news/", vakansii: "/company/vakansii/", contacts: "/contacts/", partners: "/partners/", press: "/press/", "politika-bezopasnosti": "/politika-bezopasnosti/", "usloviya-soglasheniya": "/usloviya-soglasheniya/" };

function pageFromContent(slug: string, content?: PublishedPage | null): Page | undefined {
  const source = referencePages.find((item) => item.slug === slug) as Page | undefined;
  const fallback = source || pages[slug];
  return content ? { title: content.title || fallback?.title || slug, sections: content.sections?.length ? content.sections : content.body ? [{ body: content.body }] : fallback?.sections || [] } : fallback;
}

function ContentSections({ sections }: { sections: Section[] }) {
  return <div className="content-copy">{sections.map((section, index) => <section key={index}>{section.heading && <h2>{section.heading}</h2>}<Paragraphs text={section.body} /></section>)}</div>;
}

function DeliveryContent({ page }: { page: Page }) {
  return <>
    <ContentTitleBand title={page.title} />
    <main className="delivery-content">
      <p className="delivery-intro">{page.sections[0]?.body || pages["usloviya-dostavki"].sections[0].body}</p>
      <section className="pickup-section"><h2>Самовывоз</h2><div className="pickup-map"><span className="map-loading">загрузка карты...</span><div className="pickup-address"><strong>Самовывоз осуществляется по адресу:</strong><p>Инновационный пр., 14, промзона Технопарк,<br/>рабочий посёлок Горки Ленинские</p></div></div></section>
      <section className="delivery-tariffs"><h2>Доставка</h2><p>Стоимость доставки ритуальных товаров:</p><div className="tariff-table" role="table" aria-label="Стоимость доставки"><div className="tariff-row tariff-heading" role="row"><span role="columnheader">Услуга</span><span role="columnheader">Стоимость</span></div>{[["При заказе от 150.000 рублей", "Бесплатная доставка"], ["В пределах МКАД", "4 500 ₽"], ["50 км. от МКАД", "6 000 ₽"], ["Срочная доставка (в течение 3-х часов) в пределах МКАД", "46000 ₽"], ["Срочная доставка (в течение 3-х часов) 50 км. от МКАД", "8 000 ₽"]].map(([name, price]) => <div className="tariff-row" role="row" key={name}><span role="cell">{name}</span><span role="cell">{price}</span></div>)}</div></section>
      <div className="delivery-facts"><section><h2>География доставки</h2><p>Москва и Подмосковье.<br/>Доставка к любым ритуальным объектам – кладбищам, моргам, крематориям, залам прощания.</p><img src="/c-content/dostavka1.webp" alt="География доставки" /></section><section><h2>Катафальный транспорт</h2><p>Как для перевозки гроба, так и для сопровождающих усопшего. Виды авто и цена по запросу.</p><img src="/c-content/dostavka2.webp" alt="Катафальный транспорт" /></section></div>
    </main>
  </>;
}

function ContactsContent({ page }: { page: Page }) {
  const intro = page.sections[0]?.body || pages.contacts.sections[0].body;
  const question = page.sections[1]?.body || pages.contacts.sections[1].body;
  const law = page.sections[2]?.body || pages.contacts.sections[2].body;
  const introLines = intro.split("\n\n");
  return <>
    <ContentTitleBand title={page.title} />
    <main className="contacts-content">
      <div className="contacts-map" aria-label="Карта проезда"><span>загрузка карты...</span></div>
      <section className="contact-info"><h2>{introLines[0]}</h2><div className="contact-details"><p><span className="contact-icon" aria-hidden="true">▰</span>{introLines[1]}</p><p><span className="contact-icon" aria-hidden="true">☎</span><a href="tel:+74951518474">8 495 1518474</a></p><p><span className="contact-icon" aria-hidden="true">✉</span><a href="mailto:favorit.zakaz@bk.ru">favorit.zakaz@bk.ru</a></p><p><span className="contact-icon" aria-hidden="true">◷</span>Пн-Вс: 08:00-20:00<br/>Без выходных</p></div></section>
      <div className="contact-feedback"><ContactForm /><div className="contact-portrait"><img src="/c-content/man.webp" alt="Сотрудник завода Фаворит" /></div></div>
      <div className="contact-bottom"><section className="contact-call"><h2>{page.sections[1]?.heading || "Остались вопросы?"}</h2><p>{question.split("\n\n")[0]}</p><a href="tel:+74951518474">☎ &nbsp;8 495 1518474</a></section><section className="contact-law"><h2>{page.sections[2]?.heading || "Федеральный Закон «О погребении и похоронном деле»"}</h2><p>{law.split("\n").join(" ")}</p></section></div>
    </main>
  </>;
}

export function ContentPage({ slug, content }: { slug: string; content?: PublishedPage | null }) {
  const page = pageFromContent(slug, content);
  if (!page) notFound();
  if (slug === "usloviya-dostavki") return <DeliveryContent page={page} />;
  if (slug === "contacts") return <ContactsContent page={page} />;
  return <>
    <ContentTitleBand title={page.title} className={slug === "news" ? "news-title-band" : undefined} />
    {slug === "news" ? <section className="publication-grid" aria-label="Публикации">
      {newsCards.map((article, index) => {
        const featured = [0, 7, 8].includes(index);
        const actions = <div className="publication-actions publication-featured-actions">
          <div>{article.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
          <Link className="v-btn outline" href={`/company/news/${article.slug}/`}>Подробнее <span aria-hidden="true">›</span></Link>
        </div>;
        return <article className={`publication-card${featured ? " featured" : ""}`} key={article.slug}>
          <Link className="publication-image" href={`/company/news/${article.slug}/`}>
            <img src={article.image} alt="" loading="eager" />
            {featured && <div className="publication-overlay">
              <time>{article.date}</time><h2>{article.title}</h2><p>{article.excerpt}</p>{actions}
            </div>}
          </Link>
          {!featured && <>
            <div className="publication-details"><time>{article.date}</time><Link href={`/company/news/${article.slug}/`}><h2>{article.title}</h2></Link><p>{article.excerpt}</p></div>
            {actions}
          </>}
        </article>;
      })}
      <button className="publication-more" type="button" disabled>↻ &nbsp; Больше публикаций</button>
    </section> : <div className="page-wrap content-page"><ContentSections sections={page.sections} />{(slug === "partners" || slug === "press" || slug === "vakansii") && <a className="v-btn outline" href="mailto:favorit.zakaz@bk.ru">Написать нам</a>}</div>}
  </>;
}

function Paragraphs({ text }: { text: string }) {
  return <div className="source-copy">{text.split(/\n\s*\n/).map((paragraph, index) => <p key={index}>{paragraph.split("\n").map((line, lineIndex, lines) => <span key={lineIndex}>{line}{lineIndex < lines.length - 1 && <br/>}</span>)}</p>)}</div>;
}

export function ContentArticle({ page, slug }: { page?: PublishedPage | null; slug: string }) {
  const fallback = newsCards.find((item) => item.slug === slug);
  const article = page?.title ? page : fallback ? { title: fallback.title, sections: [{ body: fallback.excerpt }] } : null;
  if (!article?.title) notFound();
  const sections = article.sections?.length ? article.sections : article.body ? [{ body: article.body }] : [];
  return <><ContentTitleBand title={article.title} /><div className="page-wrap content-page"><Breadcrumbs items={[{ name: "Публикации", href: "/company/news/" }, { name: article.title }]} /><ContentSections sections={sections} /><Link className="v-btn outline" href="/company/news/">Все публикации</Link></div></>;
}

export function knownContentRoute(path: string): string | undefined {
  const clean = path.replace(/^\/+|\/+$/g, "");
  if (["company", "contacts", "partners", "press", "politika-bezopasnosti", "usloviya-soglasheniya"].includes(clean)) return clean;
  if (["usloviya-dostavki", "usloviya-oplaty", "news", "vakansii"].some((slug) => clean === `company/${slug}`)) return clean.slice("company/".length);
  return undefined;
}
