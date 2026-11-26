import { PrismaPg } from "@prisma/adapter-pg";
import express, { type ErrorRequestHandler } from "express";
import { createClient } from "redis";
import { PrismaClient } from "../generated/prisma/client.js";
import { createApiRouter } from "./api.js";
import { logger, logRequest } from "./logger.js";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: databaseUrl,
    connectionTimeoutMillis: 2000,
    query_timeout: 2000,
  }),
});
const redis = createClient({
  url: process.env.REDIS_URL ?? "redis://127.0.0.1:6379",
  disableOfflineQueue: true,
  socket: { connectTimeout: 2000 },
});
redis.on("error", () => logger.error("Redis connection error"));
await redis.connect();

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(logRequest);

app.get("/health", async (_request, response) => {
  try {
    await Promise.all([prisma.$queryRaw`SELECT 1`, redis.ping()]);
    response.json({ status: "ok" });
  } catch {
    response.status(503).json({ status: "unavailable" });
  }
});

app.use(express.json({ limit: "256kb" }));
app.use("/api", createApiRouter(prisma, redis));
app.use("/uploads", express.static(process.env.UPLOAD_DIR ?? "uploads", {
  dotfiles: "deny",
  index: false,
  setHeaders: response => response.setHeader("X-Content-Type-Options", "nosniff"),
}));
app.use("/api", (_request, response) => {
  response.status(404).json({ error: "Маршрут не найден" });
});

const logError: ErrorRequestHandler = (error, _request, response, next) => {
  if (response.headersSent) return next(error);
  if (error.status === 413) {
    response.status(413).json({ error: "Превышен размер запроса" });
    return;
  }
  if (error.type === "entity.parse.failed") {
    response.status(400).json({ error: "Некорректный JSON" });
    return;
  }
  logger.error({
    requestId: response.getHeader("X-Request-ID"),
    type: error.name,
    code: error.code,
  }, "Unhandled request error");
  response.status(500).json({ error: "Внутренняя ошибка сервера" });
};
app.use(logError);

const server = app.listen(4000, "0.0.0.0", () => {
  logger.info({ port: 4000 }, "Backend listening");
});

function shutdown() {
  server.close(() => {
    void Promise.all([prisma.$disconnect(), redis.isOpen ? redis.close() : undefined]).catch(() => {
      process.exitCode = 1;
    });
  });
}

process.once("SIGTERM", shutdown);
process.once("SIGINT", shutdown);
