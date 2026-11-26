import { readFile } from "node:fs/promises";
import { PrismaPg } from "@prisma/adapter-pg";
const { PrismaClient } = await import(
  process.env.NODE_ENV === "production"
    ? "../dist/generated/prisma/client.js"
    : "../generated/prisma/client.js"
);

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});
const ru = (value) =>
  value.replace(
    /shch|yo|zh|kh|ts|ch|sh|yu|ya|ye|jo|ij|iy|ey|iy|a|b|v|g|d|e|z|i|y|k|l|m|n|o|p|r|s|t|u|f|h|c|w|x|q|'/g,
    (token) =>
      ({
        shch: "щ",
        yo: "ё",
        zh: "ж",
        kh: "х",
        ts: "ц",
        ch: "ч",
        sh: "ш",
        yu: "ю",
        ya: "я",
        ye: "е",
        jo: "ё",
        ij: "ый",
        iy: "ый",
        ey: "ей",
        a: "а",
        b: "б",
        v: "в",
        g: "г",
        d: "д",
        e: "е",
        z: "з",
        i: "и",
        y: "ы",
        k: "к",
        l: "л",
        m: "м",
        n: "н",
        o: "о",
        p: "п",
        r: "р",
        s: "с",
        t: "т",
        u: "у",
        f: "ф",
        h: "х",
        c: "ц",
        w: "в",
        x: "кс",
        q: "к",
        "'": "",
      })[token] ?? token,
  );
const rootNames = new Map([
  ["venki_ritualnye", "Венки ритуальные"],
  ["groby_derevyannye", "Гробы"],
  ["izdeliya_iz_litevogo_mramora", "Изделия из литьевого мрамора"],
  ["kresty_na_mogilu", "Кресты на могилу"],
  ["odezhda_ritualnaya", "Одежда для погребения"],
  ["tekstil_v_grob", "Текстиль в гроб"],
  ["urny_dlya_prakha_", "Урны для праха"],
  ["predostavlenie_uslug", "Предоставление услуг"],
  ["transport_katafalnyy_", "Транспорт катафальный"],
  ["uslugi_gruzchikov", "Услуги грузчиков"],
]);
const rootOrder = new Map(
  [
    "venki_ritualnye",
    "groby_derevyannye",
    "izdeliya_iz_litevogo_mramora",
    "kresty_na_mogilu",
    "odezhda_ritualnaya",
    "tekstil_v_grob",
    "urny_dlya_prakha_",
    "predostavlenie_uslug",
    "transport_katafalnyy_",
    "uslugi_gruzchikov",
  ].map((slug, index) => [slug, index]),
);
const measuredCategoryOrder = new Map(
  [
    "venki_avtorskie",
    "venki_detskie",
    "venki_zakaz",
    "venki_standart",
    "venki_trikolor",
    "venki_figurnye",
    "venki_elit",
    "girlyandy",
    "korziny",
    "traurnye_floretki",
    "lenty_s_tekstom_dlya_venkov_i_korzin",
    "venki_seriya_zhivye_tsvety",
  ].map((slug, index) => [slug, index]),
);
const rootImages = new Map([
  [
    "venki_ritualnye",
    "/upload/resize_cache/iblock/0e9/300_300_1/xjtdr432t6uuxlar1axzio735y8q01wr.png",
  ],
  [
    "groby_derevyannye",
    "/upload/resize_cache/iblock/65a/300_300_1/sqesdu51kb666p090zbsl7xz2azy4l4p.png",
  ],
  [
    "kresty_na_mogilu",
    "/upload/resize_cache/iblock/092/300_300_1/n91ih8jicbr1bval4gunojkz0y5yuuqk.png",
  ],
  [
    "odezhda_ritualnaya",
    "/upload/resize_cache/iblock/aa4/300_300_1/docftr9cxhpnjbh4ig2nzbhhubjvl375.png",
  ],
  [
    "tekstil_v_grob",
    "/upload/resize_cache/iblock/725/300_300_1/lh6yn1fhrry8kxx58ibkrwq7quem0p3b.png",
  ],
  [
    "urny_dlya_prakha_",
    "/upload/iblock/35f/ess9t058p7o7pnms0b0k39e4jatuxnq2.webp",
  ],
]);
const knownNames = new Map([
  ["groby_lakirovannye", "Гробы лакированные"],
  ["groby_elitnye", "Гробы элитные"],
  ["groby_tsinkovye", "Гробы цинковые"],
  ["namogilnye_komplekty", "Намогильные комплекты"],
  ["elementy_dekorativnye", "Декоративные элементы"],
  ["kresty_derevyannye_dub", "Деревянные кресты из дуба"],
  ["kresty_derevyannye_sosna", "Деревянные кресты из сосны"],
  ["kresty_derevyannye_elitnye", "Деревянные кресты элитные"],
  ["kresty_metallicheskie", "Кресты металлические"],
  ["kresty_mramornye", "Кресты мраморные"],
  ["tablichki", "Таблички"],
  ["odezhda_muzhskaya", "Одежда мужская"],
  ["odezhda_zhenskaya", "Одежда женская"],
  ["sledki", "Следки"],
  ["komplekty_", "Комплекты"],
  ["podushki", "Подушки"],
  ["pokryvala", "Покрывала"],
  ["posteli_v_grob", "Постели в гроб"],
  ["girlyandy", "Гирлянды в изголовье"],
  ["korziny", "Корзины траурные"],
  [
    "lenty_s_tekstom_dlya_venkov_i_korzin",
    "Ленты с текстом для венков и корзин",
  ],
  ["traurnye_floretki", "Траурные флоретки"],
  ["venki_avtorskie", 'Венки серия "Авторские"'],
  ["venki_detskie", 'Венки серия "Детские"'],
  ["venki_elit", 'Венки серия "Элитные"'],
  ["venki_figurnye", 'Венки серия "Фигурные"'],
  ["venki_standart", 'Венки серия "Стандартные"'],
  ["venki_trikolor", 'Венки серия "Триколор"'],
  ["venki_zakaz", 'Венки серия "Заказные"'],
  ["venki_seriya_zhivye_tsvety", 'Венки серия "Живые цветы"'],
]);
const previousSeedNames = new Map([
  ["venki_avtorskie", "Венки авторские"],
  ["venki_detskie", "Венки детские"],
  ["venki_standart", "Венки стандартные"],
  ["venki_elit", "Венки элитные"],
  ["venki_figurnye", "Венки фигурные"],
  ["venki_trikolor", "Венки Триколор"],
  ["venki_zakaz", "Венки заказные"],
  ["venki_seriya_zhivye_tsvety", "Венки с живыми цветами"],
]);
try {
  const tree = JSON.parse(
    await readFile(new URL("./category-tree.json", import.meta.url), "utf8"),
  );
  const ids = new Map();
  for (const [, slug, path] of tree) {
    const parts = path.split("/").filter(Boolean);
    const parentPath =
      parts.length > 2 ? `/${parts.slice(0, -1).join("/")}/` : null;
    const parentId = parentPath ? ids.get(parentPath) : null;
    const text = ru(slug.replaceAll("_", " ").replaceAll("-", " "));
    const autoName = text.charAt(0).toLocaleUpperCase("ru-RU") + text.slice(1);
    const name = rootNames.get(slug) ?? knownNames.get(slug) ?? autoName;
    const existing = await prisma.category.findUnique({ where: { path } });
    const measuredOrder = rootOrder.get(slug) ?? measuredCategoryOrder.get(slug);
    const sortOrder = measuredOrder ?? 0;
    const category = existing
      ? await prisma.category.update({
          where: { path },
          data: {
            ...(existing.name === autoName || existing.name === previousSeedNames.get(slug) ? { name } : {}),
            ...(measuredOrder !== undefined && existing.sortOrder === 0
              ? { sortOrder }
              : {}),
            ...(rootImages.has(slug) && !existing.image
              ? { image: rootImages.get(slug) }
              : {}),
          },
        })
      : await prisma.category.create({
          data: {
            slug,
            path,
            name,
            image: rootImages.get(slug) ?? null,
            parentId,
            sortOrder,
          },
        });
    ids.set(path, category.id);
  }
  await prisma.deliveryOption.upsert({
    where: { id: "courier" },
    update: {},
    create: {
      id: "courier",
      name: "Курьер",
      description: "Доставка курьером",
      price: 450000,
      freeFrom: 15000000,
    },
  });
  await prisma.deliveryOption.upsert({
    where: { id: "pickup" },
    update: {},
    create: {
      id: "pickup",
      name: "Самовывоз",
      description: "Бесплатный самовывоз",
      price: 0,
    },
  });
  if (process.env.SEED_DEMO === "true") {
    const urns = ids.get("/catalog/urny_dlya_prakha_/");
    await prisma.product.upsert({
      where: { sku: "DEMO-URN-001" },
      update: {},
      create: {
        categoryId: urns,
        slug: "uchebnaya-urna",
        path: "/catalog/urny_dlya_prakha_/uchebnaya-urna/",
        name: "Учебная урна",
        sku: "DEMO-URN-001",
        price: 1790000,
        description:
          "Демонстрационный товар для локальной проверки каталога и заказа.",
        images: [],
        attributes: {},
      },
    });
  }
} finally {
  await prisma.$disconnect();
}
