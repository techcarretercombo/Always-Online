import { Router, type IRouter } from "express";
import { db, usersTable, reportsTable, postsTable, notificationsTable } from "@workspace/db";
import { eq, ilike, desc, count, like } from "drizzle-orm";
import { requireAuth } from "../lib/auth-middleware";

const router: IRouter = Router();

function requireAdmin(req: any, res: any, next: any) {
  if (!req.user?.isAdmin) { res.status(403).json({ error: "Admin required" }); return; }
  next();
}

function formatUser(user: typeof usersTable.$inferSelect) {
  return { id: user.id, fullName: user.fullName, username: user.username, email: user.email, avatarUrl: user.avatarUrl ?? null, isVerified: user.isVerified, isAdmin: user.isAdmin, isBanned: user.isBanned, postsCount: 0, followersCount: 0, createdAt: user.createdAt.toISOString(), banReason: user.banReason ?? null };
}

router.get("/admin/users", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const { search, status = "all", limit = "50", offset = "0" } = req.query as Record<string, string>;
  const lim = Math.min(parseInt(limit, 10) || 50, 100);
  const off = parseInt(offset, 10) || 0;

  let users;
  if (search) {
    users = await db.select().from(usersTable).where(ilike(usersTable.username, `%${search}%`)).limit(lim).offset(off);
  } else if (status === "banned") {
    users = await db.select().from(usersTable).where(eq(usersTable.isBanned, true)).limit(lim).offset(off);
  } else if (status === "active") {
    users = await db.select().from(usersTable).where(eq(usersTable.isBanned, false)).limit(lim).offset(off);
  } else {
    users = await db.select().from(usersTable).orderBy(desc(usersTable.createdAt)).limit(lim).offset(off);
  }

  res.json(users.map(formatUser));
});

router.post("/admin/users/:id/ban", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const { reason } = req.body;
  if (!reason) { res.status(400).json({ error: "reason required" }); return; }

  await db.update(usersTable).set({ isBanned: true, banReason: reason }).where(eq(usersTable.id, id));
  res.json({ success: true });
});

router.get("/admin/reports", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const rows = await db.select({ report: reportsTable, reporter: usersTable })
    .from(reportsTable)
    .innerJoin(usersTable, eq(reportsTable.reporterId, usersTable.id))
    .orderBy(desc(reportsTable.createdAt));

  res.json(rows.map(({ report, reporter }) => ({
    id: report.id,
    reporterId: report.reporterId,
    reporter: formatUser(reporter),
    entityType: report.entityType,
    entityId: report.entityId,
    reason: report.reason,
    status: report.status,
    createdAt: report.createdAt.toISOString(),
  })));
});

router.delete("/admin/posts/:id", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  await db.delete(postsTable).where(eq(postsTable.id, id));
  res.sendStatus(204);
});

export default router;
