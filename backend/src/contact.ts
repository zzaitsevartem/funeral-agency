import type { RequestHandler } from "express";
import type { PrismaClient } from "../generated/prisma/client.js";

const clean = (value: unknown, max: number) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

export function createContactRequestHandler(prisma: PrismaClient): RequestHandler {
  return async (req, res, next) => {
    const name = clean(req.body?.name, 120);
    const phone = clean(req.body?.phone, 40);
    const email = clean(req.body?.email, 254).toLowerCase();
    const message = clean(req.body?.message, 3000);
    if (
      !name || !phone || !email || !message || req.body?.consent !== true ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      res.status(400).json({ error: "Заполните поля и подтвердите согласие на обработку данных" });
      return;
    }
    try {
      const item = await prisma.contactRequest.create({
        data: { name, phone, email, message, consentAt: new Date() },
        select: { id: true, createdAt: true },
      });
      res.status(201).json(item);
    } catch (error) {
      next(error);
    }
  };
}

export function listContactRequestsHandler(prisma: PrismaClient): RequestHandler {
  return async (req, res, next) => {
    try {
      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
      const [items, total] = await Promise.all([
        prisma.contactRequest.findMany({
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.contactRequest.count(),
      ]);
      res.json({ items, total });
    } catch (error) {
      next(error);
    }
  };
}

export function getContactRequestHandler(prisma: PrismaClient): RequestHandler {
  return async (req, res, next) => {
    try {
      const id = clean(req.params.id, 120);
      const item = id ? await prisma.contactRequest.findUnique({ where: { id } }) : null;
      if (!item) {
        res.status(404).json({ error: "Обращение не найдено" });
        return;
      }
      res.json(item);
    } catch (error) {
      next(error);
    }
  };
}
