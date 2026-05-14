import { Router, type IRouter } from "express";
import { db, storiesTable, usersTable, storyViewsTable } from "@workspace/db";
import { eq, and, gt, desc } from "drizzle-orm";
import { requireAuth, optionalAuth } from "../lib/auth-middleware";
import { sql } from "drizzle-orm";

const router: IRouter = Router();

function formatUser(user: typeof usersTable.$inferSelect) {
  return { id: user.id, fullName: user.fullName, username: user.username, email: user.email, avatarUrl: user.avatarUrl ?? null, coverUrl: user.coverUrl ?? null, bio: user.bio ?? null, isVerified: user.isVerified, isAdmin: user.isAdmin, isBanned: user.isBanned, followersCount: 0, followingCount: 0, postsCount: 0, createdAt: user.createdAt.toISOString() };
}

router.get("/stories", optionalAuth, async (req, res): Promise<void> => {
  const now = new Date();
  const currentUserId = (req as any).userId;

  const rows = await db.select({ story: storiesTable, author: usersTable })
    .from(storiesTable)
    .innerJoin(usersTable, eq(storiesTable.authorId, usersTable.id))
    .where(gt(storiesTable.expiresAt, now))
    .orderBy(desc(storiesTable.createdAt));

  const result = await Promise.all(rows.map(async ({ story, author }) => {
    let isViewed = false;
    if (currentUserId) {
      const [view] = await db.select().from(storyViewsTable).where(and(eq(storyViewsTable.storyId, story.id), eq(storyViewsTable.userId, currentUserId))).limit(1);
      isViewed = !!view;
    }
    return { id: story.id, authorId: story.authorId, author: formatUser(author), type: story.type, mediaUrl: story.mediaUrl ?? null, textContent: story.textContent ?? null, backgroundColor: story.backgroundColor ?? null, viewsCount: story.viewsCount, isViewed, createdAt: story.createdAt.toISOString(), expiresAt: story.expiresAt.toISOString() };
  }));

  res.json(result);
});

router.post("/stories", requireAuth, async (req, res): Promise<void> => {
  const authorId = (req as any).userId;
  const { type = "image", mediaUrl, textContent, backgroundColor } = req.body;
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  const [story] = await db.insert(storiesTable).values({ authorId, type, mediaUrl, textContent, backgroundColor, expiresAt }).returning();
  const [author] = await db.select().from(usersTable).where(eq(usersTable.id, authorId)).limit(1);
  res.status(201).json({ id: story.id, authorId: story.authorId, author: formatUser(author), type: story.type, mediaUrl: story.mediaUrl ?? null, textContent: story.textContent ?? null, backgroundColor: story.backgroundColor ?? null, viewsCount: story.viewsCount, isViewed: false, createdAt: story.createdAt.toISOString(), expiresAt: story.expiresAt.toISOString() });
});

router.post("/stories/:id/view", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const currentUserId = (req as any).userId;

  const existing = await db.select().from(storyViewsTable).where(and(eq(storyViewsTable.storyId, id), eq(storyViewsTable.userId, currentUserId))).limit(1);
  if (existing.length === 0) {
    await db.insert(storyViewsTable).values({ storyId: id, userId: currentUserId });
    await db.update(storiesTable).set({ viewsCount: sql`${storiesTable.viewsCount} + 1` }).where(eq(storiesTable.id, id));
  }
  res.json({ success: true });
});

export default router;
