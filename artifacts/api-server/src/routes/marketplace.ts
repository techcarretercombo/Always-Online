import { Router, type IRouter } from "express";
import { db, productsTable, usersTable } from "@workspace/db";
import { eq, and, ilike, desc } from "drizzle-orm";
import { requireAuth, optionalAuth } from "../lib/auth-middleware";

const router: IRouter = Router();

function formatUser(user: typeof usersTable.$inferSelect) {
  return { id: user.id, fullName: user.fullName, username: user.username, email: user.email, avatarUrl: user.avatarUrl ?? null, coverUrl: user.coverUrl ?? null, bio: user.bio ?? null, isVerified: user.isVerified, isAdmin: user.isAdmin, isBanned: user.isBanned, followersCount: 0, followingCount: 0, postsCount: 0, createdAt: user.createdAt.toISOString() };
}

function formatProduct(product: typeof productsTable.$inferSelect, seller: typeof usersTable.$inferSelect) {
  return { id: product.id, sellerId: product.sellerId, seller: formatUser(seller), title: product.title, description: product.description ?? null, price: parseFloat(product.price as string), category: product.category, imageUrls: product.imageUrls ?? [], condition: product.condition, location: product.location ?? null, isAvailable: product.isAvailable, viewsCount: product.viewsCount, createdAt: product.createdAt.toISOString() };
}

router.get("/marketplace/products", optionalAuth, async (req, res): Promise<void> => {
  const { search, category, limit = "20", offset = "0" } = req.query as Record<string, string>;
  const lim = Math.min(parseInt(limit, 10) || 20, 50);
  const off = parseInt(offset, 10) || 0;

  let rows;
  if (search) {
    rows = await db.select({ product: productsTable, seller: usersTable })
      .from(productsTable).innerJoin(usersTable, eq(productsTable.sellerId, usersTable.id))
      .where(ilike(productsTable.title, `%${search}%`))
      .orderBy(desc(productsTable.createdAt)).limit(lim).offset(off);
  } else if (category) {
    rows = await db.select({ product: productsTable, seller: usersTable })
      .from(productsTable).innerJoin(usersTable, eq(productsTable.sellerId, usersTable.id))
      .where(eq(productsTable.category, category))
      .orderBy(desc(productsTable.createdAt)).limit(lim).offset(off);
  } else {
    rows = await db.select({ product: productsTable, seller: usersTable })
      .from(productsTable).innerJoin(usersTable, eq(productsTable.sellerId, usersTable.id))
      .orderBy(desc(productsTable.createdAt)).limit(lim).offset(off);
  }

  res.json(rows.map(({ product, seller }) => formatProduct(product, seller)));
});

router.post("/marketplace/products", requireAuth, async (req, res): Promise<void> => {
  const sellerId = (req as any).userId;
  const { title, description, price, category, imageUrls = [], condition = "good", location } = req.body;
  if (!title || price == null || !category) { res.status(400).json({ error: "title, price, category required" }); return; }

  const [product] = await db.insert(productsTable).values({ sellerId, title, description, price: String(price), category, imageUrls, condition, location }).returning();
  const [seller] = await db.select().from(usersTable).where(eq(usersTable.id, sellerId)).limit(1);
  res.status(201).json(formatProduct(product, seller));
});

router.get("/marketplace/products/:id", optionalAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [row] = await db.select({ product: productsTable, seller: usersTable })
    .from(productsTable).innerJoin(usersTable, eq(productsTable.sellerId, usersTable.id))
    .where(eq(productsTable.id, id)).limit(1);
  if (!row) { res.status(404).json({ error: "Product not found" }); return; }

  res.json(formatProduct(row.product, row.seller));
});

export default router;
