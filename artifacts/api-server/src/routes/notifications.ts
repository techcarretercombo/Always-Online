import { Router, type IRouter } from "express";
import { db, notificationsTable, usersTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "../lib/auth-middleware";

const router: IRouter = Router();

function formatUser(user: typeof usersTable.$inferSelect) {
  return { id: user.id, fullName: user.fullName, username: user.username, email: user.email, avatarUrl: user.avatarUrl ?? null, coverUrl: user.coverUrl ?? null, bio: user.bio ?? null, isVerified: user.isVerified, isAdmin: user.isAdmin, isBanned: user.isBanned, followersCount: 0, followingCount: 0, postsCount: 0, createdAt: user.createdAt.toISOString() };
}

router.get("/notifications", requireAuth, async (req, res): Promise<void> => {
  const currentUserId = (req as any).userId;
  const { unreadOnly = "false" } = req.query as Record<string, string>;

  let rows;
  if (unreadOnly === "true") {
    rows = await db.select({ notif: notificationsTable, actor: usersTable })
      .from(notificationsTable)
      .leftJoin(usersTable, eq(notificationsTable.actorId, usersTable.id))
      .where(and(eq(notificationsTable.userId, currentUserId), eq(notificationsTable.isRead, false)))
      .orderBy(desc(notificationsTable.createdAt));
  } else {
    rows = await db.select({ notif: notificationsTable, actor: usersTable })
      .from(notificationsTable)
      .leftJoin(usersTable, eq(notificationsTable.actorId, usersTable.id))
      .where(eq(notificationsTable.userId, currentUserId))
      .orderBy(desc(notificationsTable.createdAt));
  }

  res.json(rows.map(({ notif, actor }) => ({
    id: notif.id,
    userId: notif.userId,
    type: notif.type,
    message: notif.message,
    actorId: notif.actorId ?? null,
    actor: actor ? formatUser(actor) : undefined,
    entityId: notif.entityId ?? null,
    entityType: notif.entityType ?? null,
    isRead: notif.isRead,
    createdAt: notif.createdAt.toISOString(),
  })));
});

router.post("/notifications/read-all", requireAuth, async (req, res): Promise<void> => {
  const currentUserId = (req as any).userId;
  await db.update(notificationsTable).set({ isRead: true }).where(eq(notificationsTable.userId, currentUserId));
  res.json({ success: true });
});

router.post("/notifications/:id/read", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  await db.update(notificationsTable).set({ isRead: true }).where(eq(notificationsTable.id, id));
  res.json({ success: true });
});

export default router;
