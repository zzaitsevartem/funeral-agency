import {
  createHash,
  randomBytes,
  scrypt,
  timingSafeEqual,
} from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import express, {
  Router,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import { SignJWT, jwtVerify } from "jose";
import type { RedisClientType } from "redis";
import type { Prisma, PrismaClient } from "../generated/prisma/client.js";
import {
  createContactRequestHandler,
  getContactRequestHandler,
  listContactRequestsHandler,
} from "./contact.js";

type DB = PrismaClient;
type CartItem = {
  lineId: string;
  productId: string;
  variantId?: string;
  quantity: number;
};
const COOKIE = "favorit_guest";
const TTL = 60 * 60 * 24 * 30;
const ADMIN_SESSION_TTL = 30 * 60;
const ADMIN_ISSUER = "favorit-admin";
const ADMIN_AUDIENCE = "favorit-admin-api";
const ADMIN_ACCOUNT_ID = "primary";
const SCRYPT_N = 1 << 17;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_KEY_LENGTH = 64;
const SCRYPT_MAX_MEMORY = 256 * 1024 * 1024;
const MAX_ACTIVE_SCRYPT = 2;
const DUMMY_SALT = Buffer.from("favorit-admin-auth-dummy-salt");
let activeScrypt = 0;
const rubles = (n: unknown) =>
  Number.isSafeInteger(n) && Number(n) >= 0 && Number(n) <= 2_147_483_647;
const digest = (v: string) => createHash("sha256").update(v).digest("hex");
const token = () => randomBytes(32).toString("base64url");
const str = (v: unknown, max = 500) =>
  typeof v === "string" ? v.trim().slice(0, max) : "";
const fail = (res: Response, status: number, error: string) =>
  res.status(status).json({ error });
const getCookie = (req: Request, key: string) =>
  (req.headers.cookie ?? "")
    .split(";")
    .map((v) => v.trim())
    .find((v) => v.startsWith(`${key}=`))
    ?.slice(key.length + 1);
const setCookie = (
  req: Request,
  res: Response,
  key: string,
  value: string,
  maxAge: number,
) =>
  res.append(
    "Set-Cookie",
    `${key}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${process.env.COOKIE_SECURE === "true" || req.secure || key.startsWith("__Host-") ? "; Secure" : ""}`,
  );
const clearCookie = (req: Request, res: Response, key: string) =>
  setCookie(req, res, key, "", 0);
const adminCookieName = (req: Request) =>
  process.env.COOKIE_SECURE === "true" ||
  req.secure || process.env.ADMIN_ORIGIN?.startsWith("https://")
    ? "__Host-favorit_admin"
    : "favorit_admin";
const adminJwtSecret = () => {
  const value = process.env.ADMIN_JWT_SECRET ?? "";
  return /^[\da-f]{64}$/i.test(value) ? Buffer.from(value, "hex") : null;
};
const configuredBootstrapToken = () => {
  const value = process.env.ADMIN_BOOTSTRAP_TOKEN ?? "";
  return /^[\da-f]{64}$/i.test(value) ? Buffer.from(value, "hex") : null;
};
const validAdminEmail = (value: string) =>
  value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const passwordLength = (value: string) => Array.from(value).length;

function deriveScrypt(password: string, salt: Buffer): Promise<Buffer> {
  if (activeScrypt >= MAX_ACTIVE_SCRYPT) {
    return Promise.reject(new Error("password hashing capacity exceeded"));
  }
  activeScrypt++;
  return new Promise((resolve, reject) => {
    scrypt(
      password,
      salt,
      SCRYPT_KEY_LENGTH,
      {
        N: SCRYPT_N,
        r: SCRYPT_R,
        p: SCRYPT_P,
        maxmem: SCRYPT_MAX_MEMORY,
      },
      (error, key) => {
        activeScrypt--;
        if (error) reject(error);
        else resolve(key);
      },
    );
  });
}

async function hashAdminPassword(password: string) {
  const salt = randomBytes(16);
  const hash = await deriveScrypt(password, salt);
  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt.toString("base64url")}$${hash.toString("base64url")}`;
}

async function verifyAdminPassword(password: string, encoded: string) {
  const parts = encoded.split("$");
  const formatValid =
    parts.length === 6 &&
    parts[0] === "scrypt" &&
    parts[1] === String(SCRYPT_N) &&
    parts[2] === String(SCRYPT_R) &&
    parts[3] === String(SCRYPT_P);
  const salt = formatValid ? Buffer.from(parts[4], "base64url") : DUMMY_SALT;
  const expected = formatValid
    ? Buffer.from(parts[5], "base64url")
    : Buffer.alloc(SCRYPT_KEY_LENGTH);
  const actual = await deriveScrypt(password, salt);
  return formatValid &&
    expected.length === actual.length &&
    timingSafeEqual(expected, actual);
}

type AdminRequest = Request & {
  adminSession?: { id: string; email: string; jti: string };
};
const publicProduct = (p: any) => ({
  ...p,
  images: Array.isArray(p.images) ? p.images : [],
  attributes:
    p.attributes && typeof p.attributes === "object" ? p.attributes : {},
  variants: p.variants ?? [],
});

function catalogFacets(rows: { price: number; attributes: unknown }[]) {
  let minPrice: number | null = null;
  let maxPrice: number | null = null;
  const valuesByKey = new Map<string, Map<string, number>>();
  for (const { price, attributes } of rows) {
    minPrice = minPrice === null ? price : Math.min(minPrice, price);
    maxPrice = maxPrice === null ? price : Math.max(maxPrice, price);
    if (!attributes || typeof attributes !== "object" || Array.isArray(attributes))
      continue;
    for (const [key, value] of Object.entries(attributes)) {
      if (!key || key.length > 60 || typeof value !== "string" || !value.trim() || value.length > 120)
        continue;
      const counts = valuesByKey.get(key) ?? new Map<string, number>();
      counts.set(value, (counts.get(value) ?? 0) + 1);
      valuesByKey.set(key, counts);
    }
  }
  const order = new Intl.Collator("ru", { numeric: true });
  return {
    minPrice,
    maxPrice,
    attributes: [...valuesByKey].sort(([a], [b]) => order.compare(a, b))
      .map(([key, counts]) => ({
        key,
        values: [...counts].sort(([a], [b]) => order.compare(a, b))
          .map(([value, count]) => ({ value, count })),
      })),
  };
}

export function createApiRouter(prisma: DB, redis: RedisClientType): Router {
  const router = Router({ caseSensitive: true });
  router.use((req, res, next) => {
    if (req.path === "/admin" || req.path.startsWith("/admin/")) {
      res.setHeader("Cache-Control", "no-store");
      if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
        const origin = req.get("origin");
        const expected = process.env.ADMIN_ORIGIN;
        if (!expected || origin !== expected)
          return fail(res, 403, "Недопустимый источник запроса");
        if (
          req.path !== "/admin/uploads" &&
          req.method !== "DELETE" &&
          !req.is("application/json")
        )
          return fail(res, 415, "Требуется JSON");
      }
    }
    if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
      const origin = req.get("origin");
      const host = req.get("host");
      if (origin && host) {
        try {
          if (new URL(origin).host !== host)
            return fail(res, 403, "Недопустимый источник запроса");
        } catch {
          return fail(res, 403, "Недопустимый источник запроса");
        }
      }
      if (
        req.body !== undefined &&
        !req.is("application/json") &&
        !req.path.startsWith("/admin/uploads")
      )
        return fail(res, 415, "Требуется JSON");
    }
    next();
  });
  async function guest(req: Request, res: Response) {
    let sid = getCookie(req, COOKIE);
    if (!sid || !/^[A-Za-z0-9_-]{40,}$/.test(sid)) {
      sid = token();
      setCookie(req, res, COOKIE, sid, TTL);
    }
    await redis.expire(`cart:${digest(sid)}`, TTL);
    return sid;
  }
  async function readCart(sid: string): Promise<CartItem[]> {
    const raw = await redis.get(`cart:${digest(sid)}`);
    if (!raw) return [];
    try {
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  }
  async function writeCart(sid: string, items: CartItem[]) {
    await redis.setEx(`cart:${digest(sid)}`, TTL, JSON.stringify(items));
  }
  async function cartLock<T>(sid: string, work: () => Promise<T>): Promise<T> {
    const key = `cart-lock:${digest(sid)}`,
      owner = token();
    for (let i = 0; i < 150; i++) {
      if (await redis.set(key, owner, { NX: true, EX: 30 })) {
        try {
          return await work();
        } finally {
          await redis.eval(
            "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end",
            { keys: [key], arguments: [owner] },
          );
        }
      }
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    throw new Error("cart mutation lock timeout");
  }
  async function cartJson(sid: string) {
    const entries = await readCart(sid);
    const items = [];
    for (const item of entries) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
        include: { variants: { where: { active: true } } },
      });
      if (!product || !product.active) continue;
      const variant = item.variantId
        ? product.variants.find((v) => v.id === item.variantId)
        : undefined;
      if (item.variantId && !variant) continue;
      const unitPrice = variant?.price ?? product.price;
      items.push({
        lineId: item.lineId,
        productId: product.id,
        variantId: variant?.id,
        product: publicProduct(product),
        quantity: item.quantity,
        unitPrice,
        total: unitPrice * item.quantity,
      });
    }
    return {
      items,
      subtotal: items.reduce((s, i) => s + i.total, 0),
      count: items.reduce((s, i) => s + i.quantity, 0),
    };
  }
  async function admin(req: AdminRequest, res: Response, next: NextFunction) {
    const secret = adminJwtSecret();
    const sessionToken = getCookie(req, adminCookieName(req));
    if (!secret || !sessionToken)
      return fail(res, 401, "Требуется вход администратора");

    let jti: string;
    try {
      const { payload } = await jwtVerify(sessionToken, secret, {
        algorithms: ["HS256"],
        typ: "JWT",
        issuer: ADMIN_ISSUER,
        audience: ADMIN_AUDIENCE,
        subject: ADMIN_ACCOUNT_ID,
        maxTokenAge: ADMIN_SESSION_TTL,
        requiredClaims: ["iat", "exp", "jti"],
      });
      if (!payload.jti || !/^[a-zA-Z0-9_-]{43}$/.test(payload.jti))
        return fail(res, 401, "Требуется вход администратора");
      jti = payload.jti;
    } catch {
      return fail(res, 401, "Требуется вход администратора");
    }

    try {
      const activeSession = await redis.get(`admin-session:${jti}`);
      if (activeSession !== ADMIN_ACCOUNT_ID)
        return fail(res, 401, "Требуется вход администратора");
      const account = await prisma.adminAccount.findUnique({
        where: { id: ADMIN_ACCOUNT_ID },
        select: { id: true, email: true },
      });
      if (!account) return fail(res, 401, "Требуется вход администратора");
      req.adminSession = { ...account, jti };
      next();
    } catch {
      return fail(res, 503, "Вход временно недоступен");
    }
  }
  async function limited(key: string, max: number, window = 60) {
    const k = `rate:${key}`;
    const count = await redis.eval(
      "local n = redis.call('INCR', KEYS[1]); if n == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]); end; return n",
      { keys: [k], arguments: [String(window)] },
    );
    return Number(count) <= max;
  }

  router.post("/contact-requests", async (req, res, next) => {
    try {
      if (!(await limited(digest(req.ip || "unknown"), 8, 600)))
        return fail(res, 429, "Слишком много обращений. Попробуйте позже");
      return createContactRequestHandler(prisma)(req, res, next);
    } catch (error) {
      next(error);
    }
  });

  router.get("/catalog/categories", async (_req, res, next) => {
    try {
      res.json({
        items: await prisma.category.findMany({
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        }),
      });
    } catch (e) {
      next(e);
    }
  });
  router.get("/catalog/products", async (req, res, next) => {
    try {
      const page = Math.max(1, Math.min(10000, Math.trunc(Number(req.query.page)) || 1)),
        limit = Math.max(1, Math.min(100, Math.trunc(Number(req.query.limit)) || 24));
      const includeFacets = req.query.facets === "1";
      const scope: Prisma.ProductWhereInput = { active: true };
      const category = str(req.query.category, 300);
      if (category) {
        const c = await prisma.category.findFirst({
          where: {
            OR: [
              { slug: category },
              { path: category },
              { path: category.endsWith("/") ? category : `${category}/` },
            ],
          },
        });
        if (!c) return res.json({
          items: [], total: 0, page, limit,
          ...(includeFacets ? { facets: catalogFacets([]) } : {}),
        });
        scope.category = { path: { startsWith: c.path } };
      }
      const q = str(req.query.q, 120);
      if (q)
        scope.OR = [
          { name: { contains: q, mode: "insensitive" } },
          { sku: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
        ];
      const filters: Prisma.ProductWhereInput[] = [];
      for (const key of ["color", "size"] as const) {
        const value = str(req.query[key], 120);
        if (value)
          filters.push({ attributes: { path: [key], string_contains: value } });
      }
      for (const [key, value] of Object.entries(req.query)) {
        const bracket = /^attributes\[(.{1,60})\]$/.exec(key);
        const attr =
          bracket?.[1] ??
          (key.startsWith("attribute_") ? key.slice(10).slice(0, 60) : "");
        const val = bracket
          ? typeof value === "string" && value.length <= 120 ? value : ""
          : str(value, 120);
        if (attr && val)
          filters.push({
            attributes: { path: [attr], ...(bracket ? { equals: val } : { string_contains: val }) },
          });
      }
      const minPrice = str(req.query.minPrice);
      const maxPrice = str(req.query.maxPrice);
      if (minPrice && rubles(Number(minPrice))) filters.push({ price: { gte: Number(minPrice) } });
      if (maxPrice && rubles(Number(maxPrice))) filters.push({ price: { lte: Number(maxPrice) } });
      const where = { ...scope, AND: filters };
      const sort = str(req.query.sort);
      const orderBy: Prisma.ProductOrderByWithRelationInput =
        sort === "price_asc"
          ? { price: "asc" }
          : sort === "price_desc"
            ? { price: "desc" }
            : sort === "name"
              ? { name: "asc" }
              : sort === "popular"
                ? { orderLines: { _count: "desc" } }
                : { createdAt: "desc" };
      const [total, rows, facetRows] = await Promise.all([
        prisma.product.count({ where }),
        prisma.product.findMany({
          where,
          include: { variants: { where: { active: true } } },
          orderBy: [orderBy, { id: "asc" }],
          skip: (page - 1) * limit,
          take: limit,
        }),
        includeFacets
          ? prisma.product.findMany({ where: scope, select: { price: true, attributes: true } })
          : undefined,
      ]);
      res.json({
        items: rows.map(publicProduct), total, page, limit,
        ...(facetRows ? { facets: catalogFacets(facetRows) } : {}),
      });
    } catch (e) {
      next(e);
    }
  });
  router.get("/catalog/product", async (req, res, next) => {
    try {
      const path = str(req.query.path, 500),
        id = str(req.query.id, 100);
      const p = await prisma.product.findFirst({
        where: id ? { id, active: true } : { path, active: true },
        include: { variants: { where: { active: true } } },
      });
      if (!p) return fail(res, 404, "Товар не найден");
      res.json(publicProduct(p));
    } catch (e) {
      next(e);
    }
  });
  router.get("/pages/:slug", async (req, res, next) => {
    try {
      const item = await prisma.contentPage.findFirst({
        where: { slug: str(req.params.slug, 120), active: true },
        select: { id: true, slug: true, title: true, body: true },
      });
      if (!item) return fail(res, 404, "Страница не найдена");
      res.json(item);
    } catch (e) {
      next(e);
    }
  });

  router.get("/cart", async (req, res, next) => {
    try {
      res.json(await cartJson(await guest(req, res)));
    } catch (e) {
      next(e);
    }
  });
  router.post("/cart/items", async (req, res, next) => {
    try {
      const sid = await guest(req, res);
      const productId = str(req.body?.productId, 100),
        variantId = str(req.body?.variantId, 100),
        quantity = Number(req.body?.quantity ?? 1);
      if (
        !productId ||
        !Number.isInteger(quantity) ||
        quantity < 1 ||
        quantity > 99
      )
        return fail(res, 400, "Некорректная позиция");
      const p = await prisma.product.findFirst({
        where: { id: productId, active: true },
        include: { variants: true },
      });
      if (
        !p ||
        (variantId && !p.variants.some((v) => v.id === variantId && v.active))
      )
        return fail(res, 404, "Товар или вариант не найден");
      await cartLock(sid, async () => {
        const items = await readCart(sid);
        const old = items.find(
          (i) =>
            i.productId === productId &&
            i.variantId === (variantId || undefined),
        );
        if (old) old.quantity = Math.min(99, old.quantity + quantity);
        else
          items.push({
            lineId: token().slice(0, 24),
            productId,
            ...(variantId ? { variantId } : {}),
            quantity,
          });
        await writeCart(sid, items);
      });
      res.json(await cartJson(sid));
    } catch (e) {
      next(e);
    }
  });
  router.patch("/cart/items/:lineId", async (req, res, next) => {
    try {
      const sid = await guest(req, res),
        q = Number(req.body?.quantity);
      if (!Number.isInteger(q) || q < 1 || q > 99)
        return fail(res, 400, "Количество должно быть от 1 до 99");
      let found = false;
      await cartLock(sid, async () => {
        const items = await readCart(sid),
          line = items.find((i) => i.lineId === req.params.lineId);
        if (!line) return;
        found = true;
        line.quantity = q;
        await writeCart(sid, items);
      });
      if (!found) return fail(res, 404, "Позиция не найдена");
      res.json(await cartJson(sid));
    } catch (e) {
      next(e);
    }
  });
  router.delete("/cart/items/:lineId", async (req, res, next) => {
    try {
      const sid = await guest(req, res);
      await cartLock(
        sid,
        async () =>
          await writeCart(
            sid,
            (await readCart(sid)).filter((i) => i.lineId !== req.params.lineId),
          ),
      );
      res.json(await cartJson(sid));
    } catch (e) {
      next(e);
    }
  });
  router.get("/checkout/options", async (_req, res, next) => {
    try {
      const delivery = await prisma.deliveryOption.findMany({
        where: { active: true },
      });
      res.json({
        delivery,
        payment: [
          { id: "cash", name: "Наличные курьеру" },
          ...(process.env.PAYMENT_MODE === "test"
            ? [{ id: "online", name: "Тестовая оплата" }]
            : []),
        ],
      });
    } catch (e) {
      next(e);
    }
  });

  async function makeOrder(req: Request, res: Response, quick = false) {
    const sid = await guest(req, res);
    return cartLock(sid, async () => {
      const b = req.body ?? {};
      if (b.consent !== true)
        return fail(res, 400, "Необходимо согласие на обработку данных");
      const phone = str(b.phone, 40);
      if (!phone || phone.replace(/\D/g, "").length < 10)
        return fail(res, 400, "Укажите телефон");
      const name = quick ? "Покупатель" : str(b.name, 160);
      if (!name) return fail(res, 400, "Укажите имя");
      const email = str(b.email, 254);
      if (!quick && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        return fail(res, 400, "Укажите корректный email");
      const deliveryId = quick ? "pickup" : str(b.delivery, 40),
        paymentMethod = quick ? "cash" : str(b.payment, 20);
      if (!quick && !["courier", "pickup"].includes(deliveryId))
        return fail(res, 400, "Некорректный способ доставки");
      if (!quick && !["cash", "online"].includes(paymentMethod))
        return fail(res, 400, "Некорректный способ оплаты");
      if (paymentMethod === "online" && process.env.PAYMENT_MODE !== "test")
        return fail(res, 400, "Онлайн-оплата недоступна");
      const city = str(b.city, 120),
        address = str(b.address, 300);
      if (!quick && deliveryId === "courier" && (!city || !address))
        return fail(res, 400, "Для курьерской доставки нужны город и адрес");
      const key = str(req.get("idempotency-key") || b.idempotencyKey, 120);
      if (key && !/^[A-Za-z0-9_-]{8,120}$/.test(key))
        return fail(res, 400, "Некорректный ключ идемпотентности");
      if (key) {
        const existing = await prisma.order.findUnique({
          where: { idempotencyKey: key },
          include: { payment: true },
        });
        if (existing) {
          if (existing.sessionHash !== digest(sid))
            return fail(res, 409, "Ключ заказа уже использован");
          return res.status(200).json(await orderSummary(existing));
        }
      }
      let cartItems: CartItem[];
      if (quick) {
        const p = await prisma.product.findFirst({
          where: { id: str(b.productId, 100), active: true },
          include: { variants: true },
        });
        const variantId = str(b.variantId, 100);
        if (
          !p ||
          (variantId && !p.variants.some((v) => v.id === variantId && v.active))
        )
          return fail(res, 404, "Товар не найден");
        cartItems = [
          {
            lineId: token(),
            productId: p.id,
            ...(variantId ? { variantId } : {}),
            quantity: 1,
          },
        ];
      } else cartItems = await readCart(sid);
      if (!cartItems.length) return fail(res, 400, "Корзина пуста");
      const resolved: {
        productId: string;
        variantId?: string;
        name: string;
        sku: string;
        unitPrice: number;
        quantity: number;
        total: number;
      }[] = [];
      for (const i of cartItems) {
        const p = await prisma.product.findFirst({
          where: { id: i.productId, active: true },
          include: { variants: true },
        });
        const v = i.variantId
          ? p?.variants.find((x) => x.id === i.variantId && x.active)
          : undefined;
        if (!p || (i.variantId && !v))
          return fail(res, 409, "Состав корзины изменился; обновите корзину");
        const unitPrice = v?.price ?? p.price;
        if (!Number.isSafeInteger(unitPrice * i.quantity))
          return fail(res, 400, "Некорректная сумма заказа");
        resolved.push({
          productId: p.id,
          variantId: v?.id,
          name: p.name,
          sku: v?.sku ?? p.sku,
          unitPrice,
          quantity: i.quantity,
          total: unitPrice * i.quantity,
        });
      }
      const subtotal = resolved.reduce((s, i) => s + i.total, 0);
      const delivery = !quick
        ? await prisma.deliveryOption.findUnique({ where: { id: deliveryId } })
        : null;
      if (!quick && !delivery?.active)
        return fail(res, 400, "Доставка недоступна");
      const deliveryPrice =
          delivery &&
          delivery.freeFrom !== null &&
          subtotal >= delivery.freeFrom
            ? 0
            : (delivery?.price ?? 0),
        total = subtotal + deliveryPrice;
      if (!rubles(subtotal) || !rubles(total))
        return fail(res, 400, "Сумма заказа превышает допустимый предел");
      try {
        const created = await prisma.$transaction(async (tx) => {
          const order = await tx.order.create({
            data: {
              number: `F${Date.now()}${randomBytes(4).toString("hex").toUpperCase()}`,
              idempotencyKey: key || null,
              sessionHash: digest(sid),
              kind: quick ? "quick" : "cart",
              assistance: quick && b.assistance === true,
              paymentMethod,
              deliveryMethod: quick ? "pickup" : deliveryId,
              deliveryPrice,
              subtotal,
              total,
              name,
              email: email || null,
              phone,
              city: city || null,
              address: address || null,
              comment: str(b.comment, 2000) || null,
              consentAt: new Date(),
              lines: { create: resolved },
            },
          });
          if (paymentMethod === "online")
            await tx.payment.create({
              data: {
                orderId: order.id,
                method: "test",
                amount: total,
                reference: token(),
              },
            });
          return tx.order.findUniqueOrThrow({
            where: { id: order.id },
            include: { payment: true },
          });
        });
        if (!quick) await writeCart(sid, []);
        return res.status(201).json(await orderSummary(created));
      } catch (e: any) {
        if (e?.code === "P2002" && key) {
          const existing = await prisma.order.findUnique({
            where: { idempotencyKey: key },
            include: { payment: true },
          });
          if (existing?.sessionHash === digest(sid))
            return res.status(200).json(await orderSummary(existing));
          return fail(res, 409, "Ключ заказа уже использован");
        }
        throw e;
      }
    });
  }
  async function orderSummary(o: any) {
    return {
      id: o.id,
      number: o.number,
      status: o.status,
      paymentStatus: o.paymentStatus,
      total: o.total,
      ...(o.payment?.status === "pending"
        ? { paymentUrl: `/payment/${o.payment.reference}` }
        : {}),
    };
  }
  router.post("/orders", async (req, res, next) => {
    try {
      if (!(await limited(`order:${digest(req.ip ?? "")}`, 8, 600)))
        return fail(res, 429, "Слишком много заказов");
      await makeOrder(req, res);
    } catch (e) {
      next(e);
    }
  });
  router.post("/orders/quick", async (req, res, next) => {
    try {
      if (!(await limited(`order:${digest(req.ip ?? "")}`, 8, 600)))
        return fail(res, 429, "Слишком много заказов");
      await makeOrder(req, res, true);
    } catch (e) {
      next(e);
    }
  });
  router.get("/orders/:id", async (req, res, next) => {
    try {
      const sid = getCookie(req, COOKIE);
      if (!sid) return fail(res, 404, "Заказ не найден");
      const o = await prisma.order.findFirst({
        where: { id: req.params.id, sessionHash: digest(sid) },
      });
      if (!o) return fail(res, 404, "Заказ не найден");
      res.json(await orderSummary(o));
    } catch (e) {
      next(e);
    }
  });
  router.get("/payments/test/:ref", async (req, res, next) => {
    try {
      if (process.env.PAYMENT_MODE !== "test")
        return fail(res, 404, "Страница не найдена");
      const p = await prisma.payment.findUnique({
        where: { reference: req.params.ref },
        include: { order: true },
      });
      const sid = getCookie(req, COOKIE);
      if (!p || !sid || p.order.sessionHash !== digest(sid))
        return fail(res, 404, "Платёж не найден");
      res.json({
        orderId: p.orderId,
        amount: p.amount,
        status: p.status,
        testOnly: true,
      });
    } catch (e) {
      next(e);
    }
  });
  router.post("/payments/test/:ref", async (req, res, next) => {
    try {
      if (process.env.PAYMENT_MODE !== "test")
        return fail(res, 404, "Маршрут недоступен");
      const result = req.body?.result;
      if (!["paid", "failed"].includes(result))
        return fail(res, 400, "Некорректный результат");
      const sid = getCookie(req, COOKIE);
      if (!sid) return fail(res, 404, "Платёж не найден");
      const p = await prisma.payment.findUnique({
        where: { reference: req.params.ref },
        include: { order: true },
      });
      if (!p || p.order.sessionHash !== digest(sid))
        return fail(res, 404, "Платёж не найден");
      const status = await prisma.$transaction(async (tx) => {
        const updated = await tx.payment.updateMany({
          where: { id: p.id, status: "pending" },
          data: { status: result, result },
        });
        if (updated.count) {
          await tx.order.updateMany({
            where: { id: p.orderId, paymentStatus: "pending" },
            data: { paymentStatus: result },
          });
          return result;
        }
        return (await tx.payment.findUniqueOrThrow({ where: { id: p.id } }))
          .status;
      });
      res.json({ orderId: p.orderId, status });
    } catch (e) {
      next(e);
    }
  });

  const readCredentials = (req: Request) => ({
    email: typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "",
    password: typeof req.body?.password === "string" ? req.body.password : "",
  });

  router.get("/admin/bootstrap", async (_req, res) => {
    const enabled = Boolean(adminJwtSecret() && configuredBootstrapToken());
    const enrolled = enabled && Boolean(await prisma.adminAccount.findUnique({
      where: { id: ADMIN_ACCOUNT_ID }, select: { id: true },
    }));
    res.json({ available: enabled && !enrolled });
  });

  router.post("/admin/register", async (req, res) => {
    const expected = configuredBootstrapToken();
    if (!adminJwtSecret() || !expected)
      return fail(res, 503, "Регистрация недоступна");
    if (!(await limited(`admin-register:${digest(req.ip ?? "")}`, 8, 600)))
      return fail(res, 429, "Слишком много попыток");
    if (await prisma.adminAccount.findUnique({ where: { id: ADMIN_ACCOUNT_ID }, select: { id: true } }))
      return fail(res, 409, "Регистрация уже закрыта");

    const { email, password } = readCredentials(req);
    const provided = req.body?.bootstrapToken;
    if (
      typeof provided !== "string" || !/^[\da-f]{64}$/i.test(provided) ||
      !timingSafeEqual(Buffer.from(provided, "hex"), expected) ||
      !validAdminEmail(email) || password.length > 512 ||
      passwordLength(password) < 15 || passwordLength(password) > 256
    ) return fail(res, 400, "Проверьте данные регистрации");
    if (activeScrypt >= MAX_ACTIVE_SCRYPT)
      return fail(res, 503, "Регистрация временно недоступна");

    const passwordHash = await hashAdminPassword(password);
    try {
      const account = await prisma.adminAccount.create({
        data: { id: ADMIN_ACCOUNT_ID, email, passwordHash },
        select: { email: true },
      });
      res.status(201).json(account);
    } catch (error) {
      if (typeof error === "object" && error && "code" in error && error.code === "P2002")
        return fail(res, 409, "Регистрация уже закрыта");
      throw error;
    }
  });

  router.post("/admin/login", async (req, res) => {
    const secret = adminJwtSecret();
    if (!secret) return fail(res, 503, "Вход недоступен");
    const { email, password } = readCredentials(req);
    const [ipAllowed, accountAllowed] = await Promise.all([
      limited(`admin-login-ip:${digest(req.ip ?? "")}`, 25, 900),
      limited(`admin-login-email:${digest(email)}`, 12, 900),
    ]);
    if (!ipAllowed || !accountAllowed)
      return fail(res, 429, "Слишком много попыток входа");
    if (!validAdminEmail(email) || password.length > 512 || passwordLength(password) > 256)
      return fail(res, 401, "Неверные учётные данные");
    if (activeScrypt >= MAX_ACTIVE_SCRYPT)
      return fail(res, 503, "Вход временно недоступен");
    const account = await prisma.adminAccount.findUnique({ where: { email } });
    if (!(await verifyAdminPassword(password, account?.passwordHash ?? "")) || !account)
      return fail(res, 401, "Неверные учётные данные");

    const jti = token();
    const issuedAt = Math.floor(Date.now() / 1000);
    const jwt = await new SignJWT({})
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setSubject(account.id)
      .setIssuer(ADMIN_ISSUER)
      .setAudience(ADMIN_AUDIENCE)
      .setJti(jti)
      .setIssuedAt(issuedAt)
      .setExpirationTime(issuedAt + ADMIN_SESSION_TTL)
      .sign(secret);
    await redis.setEx(`admin-session:${jti}`, ADMIN_SESSION_TTL, account.id);
    setCookie(req, res, adminCookieName(req), jwt, ADMIN_SESSION_TTL);
    res.json({ email: account.email });
  });
  router.get("/admin/session", admin, (req: AdminRequest, res) => {
    res.json({ email: req.adminSession!.email });
  });
  router.post("/admin/logout", admin, async (req: AdminRequest, res) => {
    await redis.del(`admin-session:${req.adminSession!.jti}`);
    clearCookie(req, res, adminCookieName(req));
    res.status(204).end();
  });

  router.use("/admin", admin);
  router.get("/admin/contact-requests", listContactRequestsHandler(prisma));
  router.get("/admin/contact-requests/:id", getContactRequestHandler(prisma));
  router.get("/admin/categories", async (_req, res, next) => {
    try {
      const items = await prisma.category.findMany({
        include: { _count: { select: { products: true, children: true } } },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      });
      res.json({ items, total: items.length });
    } catch (e) {
      next(e);
    }
  });
  router.post("/admin/categories", async (req, res, next) => {
    try {
      const {
        name,
        slug,
        parentId = null,
        image = null,
        description = "",
        sortOrder = 0,
      } = req.body ?? {};
      const s = str(slug, 100),
        n = str(name, 160);
      if (!n || !/^[a-z0-9_-]+$/.test(s) || !Number.isInteger(sortOrder))
        return fail(res, 400, "Некорректная категория");
      const parent = parentId
        ? await prisma.category.findUnique({
            where: { id: str(parentId, 100) },
          })
        : null;
      if (parentId && !parent) return fail(res, 400, "Родитель не найден");
      const path = `${parent?.path ?? "/catalog/"}${s}/`;
      res
        .status(201)
        .json(
          await prisma.category.create({
            data: {
              name: n,
              slug: s,
              parentId: parent?.id ?? null,
              path,
              image: str(image, 500) || null,
              description: str(description, 2000),
              sortOrder,
            },
          }),
        );
    } catch (e: any) {
      if (e?.code === "P2002") return fail(res, 409, "Путь уже занят");
      next(e);
    }
  });
  router.get("/admin/categories/:id", async (req, res, next) => {
    try {
      const item = await prisma.category.findUnique({
        where: { id: req.params.id },
        include: { _count: { select: { products: true, children: true } } },
      });
      if (!item) return fail(res, 404, "Категория не найдена");
      res.json(item);
    } catch (e) {
      next(e);
    }
  });
  router.patch("/admin/categories/:id", async (req, res, next) => {
    try {
      const current = await prisma.category.findUnique({
        where: { id: req.params.id },
      });
      if (!current) return fail(res, 404, "Категория не найдена");
      const d = req.body ?? {};
      if (d.parentId !== undefined && d.parentId !== current.parentId)
        return fail(res, 400, "Перемещение категорий временно недоступно");
      const data: any = {};
      for (const key of ["name", "description", "image", "sortOrder"] as const)
        if (d[key] !== undefined)
          data[key] =
            key === "sortOrder"
              ? Number(d[key])
              : key === "image"
                ? str(d[key], 500) || null
                : str(d[key], key === "description" ? 2000 : 160);
      if (d.slug !== undefined) {
        const slug = str(d.slug, 100);
        if (!/^[a-z0-9_-]+$/.test(slug))
          return fail(res, 400, "Некорректный slug");
        if (slug !== current.slug) {
          const counts = await prisma.category.findUnique({
            where: { id: current.id },
            include: { _count: { select: { children: true, products: true } } },
          });
          if (counts && (counts._count.children || counts._count.products))
            return fail(res, 409, "Нельзя изменить URL категории с содержимым");
        }
        data.slug = slug;
        data.path = `${current.path.slice(0, -current.slug.length - 1)}${slug}/`;
      }
      res.json(
        await prisma.category.update({ where: { id: current.id }, data }),
      );
    } catch (e) {
      next(e);
    }
  });
  router.delete("/admin/categories/:id", async (req, res, next) => {
    try {
      const c = await prisma.category.findUnique({
        where: { id: req.params.id },
        include: { _count: { select: { products: true, children: true } } },
      });
      if (!c) return fail(res, 404, "Категория не найдена");
      if (c._count.products || c._count.children)
        return fail(res, 409, "Категория содержит товары или подразделы");
      await prisma.category.delete({ where: { id: c.id } });
      res.status(204).end();
    } catch (e) {
      next(e);
    }
  });

  router.get("/admin/products", async (req, res, next) => {
    try {
      const page = Math.max(1, Number(req.query.page) || 1),
        limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
      const where: any = {};
      if (req.query.active !== undefined)
        where.active = req.query.active === "true";
      const [items, total] = await Promise.all([
        prisma.product.findMany({
          where,
          include: { variants: true, category: true },
          orderBy: { updatedAt: "desc" },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.product.count({ where }),
      ]);
      res.json({ items: items.map(publicProduct), total });
    } catch (e) {
      next(e);
    }
  });
  router.post("/admin/products", async (req, res, next) => {
    try {
      const d = req.body ?? {},
        categoryId = str(d.categoryId, 100),
        name = str(d.name, 200),
        slug = str(d.slug, 120),
        sku = str(d.sku, 100),
        price = Number(d.price);
      const category = await prisma.category.findUnique({
        where: { id: categoryId },
      });
      if (
        !category ||
        !name ||
        !/^[a-zA-Z0-9_-]+$/.test(slug) ||
        !sku ||
        !rubles(price)
      )
        return fail(
          res,
          400,
          "Проверьте категорию, название, slug, артикул и цену в копейках",
        );
      const path = `${category.path}${slug}/`;
      const images = Array.isArray(d.images)
        ? d.images.filter((x: unknown) => typeof x === "string").slice(0, 12)
        : [];
      const p = await prisma.product.create({
        data: {
          categoryId,
          name,
          slug,
          path,
          sku,
          price,
          description: str(d.description, 5000),
          images,
          attributes:
            d.attributes &&
            typeof d.attributes === "object" &&
            !Array.isArray(d.attributes)
              ? d.attributes
              : {},
          variants: {
            create: (Array.isArray(d.variants) ? d.variants : [])
              .slice(0, 50)
              .map((v: any) => ({
                name: str(v.name, 120),
                sku: str(v.sku, 100),
                price: Number(v.price),
                attributes: v.attributes ?? {},
              })),
          },
        },
        include: { variants: true },
      });
      res.status(201).json(publicProduct(p));
    } catch (e: any) {
      if (e?.code === "P2002")
        return fail(res, 409, "Артикул или URL уже используется");
      next(e);
    }
  });
  router.get("/admin/products/:id", async (req, res, next) => {
    try {
      const p = await prisma.product.findUnique({
        where: { id: req.params.id },
        include: { variants: true },
      });
      if (!p) return fail(res, 404, "Товар не найден");
      res.json(publicProduct(p));
    } catch (e) {
      next(e);
    }
  });
  router.patch("/admin/products/:id", async (req, res, next) => {
    try {
      const p = await prisma.product.findUnique({
        where: { id: req.params.id },
      });
      if (!p) return fail(res, 404, "Товар не найден");
      const d = req.body ?? {},
        data: any = {};
      for (const key of ["name", "sku", "description", "active"] as const)
        if (d[key] !== undefined)
          data[key] = key === "active" ? d[key] === true : str(d[key], 5000);
      if (d.price !== undefined) {
        if (!rubles(Number(d.price)))
          return fail(res, 400, "Цена задается целым числом копеек");
        data.price = Number(d.price);
      }
      if (d.images !== undefined)
        data.images = Array.isArray(d.images)
          ? d.images.filter((x: unknown) => typeof x === "string").slice(0, 12)
          : [];
      if (d.attributes !== undefined)
        data.attributes =
          d.attributes &&
          typeof d.attributes === "object" &&
          !Array.isArray(d.attributes)
            ? d.attributes
            : {};
      if (d.categoryId || d.slug) {
        const c = await prisma.category.findUnique({
          where: { id: str(d.categoryId ?? p.categoryId, 100) },
        });
        const slug = str(d.slug ?? p.slug, 120);
        if (!c || !/^[a-zA-Z0-9_-]+$/.test(slug))
          return fail(res, 400, "Некорректный путь товара");
        data.categoryId = c.id;
        data.slug = slug;
        data.path = `${c.path}${slug}/`;
      }
      res.json(
        publicProduct(
          await prisma.product.update({
            where: { id: p.id },
            data,
            include: { variants: true },
          }),
        ),
      );
    } catch (e) {
      next(e);
    }
  });
  router.delete("/admin/products/:id", async (req, res, next) => {
    try {
      const p = await prisma.product.findUnique({
        where: { id: req.params.id },
      });
      if (!p) return fail(res, 404, "Товар не найден");
      await prisma.product.update({
        where: { id: p.id },
        data: { active: false },
      });
      res.status(204).end();
    } catch (e) {
      next(e);
    }
  });
  router.get("/admin/orders", async (req, res, next) => {
    try {
      const page = Math.max(1, Number(req.query.page) || 1),
        limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
      const [items, total] = await Promise.all([
        prisma.order.findMany({
          include: { lines: true, payment: true },
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.order.count(),
      ]);
      res.json({ items, total });
    } catch (e) {
      next(e);
    }
  });
  router.get("/admin/orders/:id", async (req, res, next) => {
    try {
      const item = await prisma.order.findUnique({
        where: { id: req.params.id },
        include: { lines: true, payment: true },
      });
      if (!item) return fail(res, 404, "Заказ не найден");
      res.json(item);
    } catch (e) {
      next(e);
    }
  });
  router.patch("/admin/orders/:id", async (req, res, next) => {
    try {
      const status = str(req.body?.status, 20);
      if (!["new", "processing", "completed", "cancelled"].includes(status))
        return fail(res, 400, "Некорректный статус заказа");
      res.json(
        await prisma.order.update({
          where: { id: req.params.id },
          data: { status },
        }),
      );
    } catch (e) {
      next(e);
    }
  });
  router.get("/admin/payments", async (_req, res, next) => {
    try {
      const items = await prisma.payment.findMany({
        include: {
          order: {
            select: {
              id: true,
              number: true,
              total: true,
              paymentStatus: true,
              createdAt: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
      res.json({ items, total: items.length });
    } catch (e) {
      next(e);
    }
  });
  router.get("/admin/payments/:id", async (req, res, next) => {
    try {
      const item = await prisma.payment.findUnique({
        where: { id: req.params.id },
        include: {
          order: {
            select: {
              id: true,
              number: true,
              total: true,
              paymentStatus: true,
            },
          },
        },
      });
      if (!item) return fail(res, 404, "Платёж не найден");
      res.json(item);
    } catch (e) {
      next(e);
    }
  });
  router.get("/admin/delivery", async (_req, res, next) => {
    try {
      const items = await prisma.deliveryOption.findMany();
      res.json({ items, total: items.length });
    } catch (e) {
      next(e);
    }
  });
  router.get("/admin/delivery/:id", async (req, res, next) => {
    try {
      const item = await prisma.deliveryOption.findUnique({
        where: { id: req.params.id },
      });
      if (!item) return fail(res, 404, "Способ доставки не найден");
      res.json(item);
    } catch (e) {
      next(e);
    }
  });
  router.patch("/admin/delivery/:id", async (req, res, next) => {
    try {
      const d = req.body ?? {},
        data: any = {};
      if (d.name !== undefined) data.name = str(d.name, 120);
      if (d.description !== undefined)
        data.description = str(d.description, 500);
      if (d.price !== undefined && rubles(Number(d.price)))
        data.price = Number(d.price);
      else if (d.price !== undefined) return fail(res, 400, "Цена в копейках");
      if (d.freeFrom !== undefined)
        data.freeFrom = d.freeFrom === null ? null : Number(d.freeFrom);
      if (d.active !== undefined) data.active = d.active === true;
      res.json(
        await prisma.deliveryOption.update({
          where: { id: req.params.id },
          data,
        }),
      );
    } catch (e) {
      next(e);
    }
  });
  router.get("/admin/pages", async (_req, res, next) => {
    try {
      const items = await prisma.contentPage.findMany();
      res.json({ items, total: items.length });
    } catch (e) {
      next(e);
    }
  });
  router.get("/admin/pages/:id", async (req, res, next) => {
    try {
      const item = await prisma.contentPage.findUnique({
        where: { id: req.params.id },
      });
      if (!item) return fail(res, 404, "Страница не найдена");
      res.json(item);
    } catch (e) {
      next(e);
    }
  });
  router.post("/admin/pages", async (req, res, next) => {
    try {
      const slug = str(req.body?.slug, 120),
        title = str(req.body?.title, 200);
      if (!/^[a-z0-9_-]+$/.test(slug) || !title)
        return fail(res, 400, "Некорректная страница");
      res
        .status(201)
        .json(
          await prisma.contentPage.create({
            data: { slug, title, body: str(req.body?.body, 20000) },
          }),
        );
    } catch (e) {
      next(e);
    }
  });
  router.patch("/admin/pages/:id", async (req, res, next) => {
    try {
      const d = req.body ?? {},
        data: any = {};
      if (d.title !== undefined) data.title = str(d.title, 200);
      if (d.body !== undefined) data.body = str(d.body, 20000);
      if (d.active !== undefined) data.active = d.active === true;
      res.json(
        await prisma.contentPage.update({ where: { id: req.params.id }, data }),
      );
    } catch (e) {
      next(e);
    }
  });
  router.delete("/admin/pages/:id", async (req, res, next) => {
    try {
      await prisma.contentPage.delete({ where: { id: req.params.id } });
      res.status(204).end();
    } catch (e) {
      next(e);
    }
  });
  router.post("/admin/products/:id/variants", async (req, res, next) => {
    try {
      const p = await prisma.product.findUnique({
        where: { id: req.params.id },
      });
      const d = req.body ?? {};
      if (
        !p ||
        !str(d.name, 120) ||
        !str(d.sku, 100) ||
        !rubles(Number(d.price))
      )
        return fail(res, 400, "Некорректный вариант товара");
      const item = await prisma.variant.create({
        data: {
          productId: p.id,
          name: str(d.name, 120),
          sku: str(d.sku, 100),
          price: Number(d.price),
          attributes:
            d.attributes &&
            typeof d.attributes === "object" &&
            !Array.isArray(d.attributes)
              ? d.attributes
              : {},
        },
      });
      res.status(201).json(item);
    } catch (e: any) {
      if (e?.code === "P2002")
        return fail(res, 409, "Артикул варианта уже используется");
      next(e);
    }
  });
  router.patch(
    "/admin/products/:id/variants/:variantId",
    async (req, res, next) => {
      try {
        const item = await prisma.variant.findFirst({
          where: { id: req.params.variantId, productId: req.params.id },
        });
        if (!item) return fail(res, 404, "Вариант не найден");
        const d = req.body ?? {},
          data: any = {};
        if (d.name !== undefined) data.name = str(d.name, 120);
        if (d.sku !== undefined) data.sku = str(d.sku, 100);
        if (d.price !== undefined) {
          if (!rubles(Number(d.price)))
            return fail(res, 400, "Цена задается целым числом копеек");
          data.price = Number(d.price);
        }
        if (d.active !== undefined) data.active = d.active === true;
        if (d.attributes !== undefined)
          data.attributes =
            d.attributes &&
            typeof d.attributes === "object" &&
            !Array.isArray(d.attributes)
              ? d.attributes
              : {};
        res.json(await prisma.variant.update({ where: { id: item.id }, data }));
      } catch (e: any) {
        if (e?.code === "P2002")
          return fail(res, 409, "Артикул варианта уже используется");
        next(e);
      }
    },
  );
  router.delete(
    "/admin/products/:id/variants/:variantId",
    async (req, res, next) => {
      try {
        const result = await prisma.variant.updateMany({
          where: { id: req.params.variantId, productId: req.params.id },
          data: { active: false },
        });
        if (!result.count) return fail(res, 404, "Вариант не найден");
        res.status(204).end();
      } catch (e) {
        next(e);
      }
    },
  );
  router.put(
    "/admin/uploads",
    express.raw({
      type: ["image/jpeg", "image/png", "image/webp", "image/gif"],
      limit: "8mb",
    }),
    async (req, res, next) => {
      try {
        if (!Buffer.isBuffer(req.body) || req.body.length < 12)
          return fail(res, 400, "Передайте изображение размером до 8 МБ");
        const b: Buffer = req.body;
        let ext = "";
        if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) ext = "jpg";
        else if (
          b
            .subarray(0, 8)
            .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
        )
          ext = "png";
        else if (
          b.toString("ascii", 0, 4) === "RIFF" &&
          b.toString("ascii", 8, 12) === "WEBP"
        )
          ext = "webp";
        else if (
          b.toString("ascii", 0, 6) === "GIF87a" ||
          b.toString("ascii", 0, 6) === "GIF89a"
        )
          ext = "gif";
        if (!ext) return fail(res, 415, "Формат изображения не поддерживается");
        const filename = `${randomBytes(20).toString("hex")}.${ext}`,
          dir = process.env.UPLOAD_DIR ?? "/app/uploads";
        await mkdir(dir, { recursive: true });
        await writeFile(join(dir, filename), b, { flag: "wx", mode: 0o644 });
        res.status(201).json({ url: `/uploads/${filename}` });
      } catch (e) {
        next(e);
      }
    },
  );
  return router;
}
