import { randomUUID } from "node:crypto";
import type { RequestHandler } from "express";
import pino from "pino";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  base: { service: "backend" },
});

export const logRequest: RequestHandler = (request, response, next) => {
  const id = request.get("x-request-id");
  const requestId = id && /^[a-zA-Z0-9-]{1,64}$/.test(id) ? id : randomUUID();
  const start = performance.now();
  const path = request.path.replace(/^(\/api\/payments\/test|\/payment)\/[^/]+/, "$1/:token");

  response.setHeader("X-Request-ID", requestId);
  response.on("finish", () => {
    const status = response.statusCode;
    if (path === "/health" && status === 200) return;

    logger[status >= 500 ? "error" : "info"]({
      requestId,
      method: request.method,
      path,
      status,
      durationMs: Math.round(performance.now() - start),
    }, "HTTP request");
  });
  next();
};
