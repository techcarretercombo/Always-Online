import { Router, type IRouter } from "express";
import { db, reelsTable, usersTable, reelLikesTable } from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";
import { requireAuth, optionalAuth } from "../lib/auth-middleware";

const router: IRouter = Router();

function formatUser(user: typeof usersTable.$inferSelect) {
  return { id: user.id, fullName: user.fullName, username: user.username, email: user.email, avatarUrl: user.avatarUrl ?? null, coverUrl: user.coverUrl ?? null, bio: user.bio ?? null, isVerified: user.isVerified, isAdmin: user.isAdmin, isBanned: user.isBanned, followersCount: 0, followingCount: 0, postsCount: 0, createdAt: user.createdAt.toISOString() };
}

router.get("/reels", optionalAuth, async (req, res): Promise<void> => {
  const { limit = "10", offset = "0" } = req.query as Record<string, string>;
  const lim = Math.min(parseInt(limit, 10) || 10, 30);
  const off = parseInt(offset, 10) || 0;
  const currentUserId = (req as any).userId;

  const rows = await db.select({ reel: reelsTable, author: usersTable })
    .from(reelsTable)
    .innerJoin(usersTable, eq(reelsTable.authorId, usersTable.id))
    .orderBy(desc(reelsTable.createdAt))
    .limit(lim).offset(off);

  const result = await Promise.all(rows.map(async ({ reel, author }) => {
    let isLiked = false;
    if (currentUserId) {
      const [like] = await db.select().from(reelLikesTable).where(and(eq(reelLikesTable.reelId, reel.id), eq(reelLikesTable.userId, currentUserId))).limit(1);
      isLiked = !!like;
    }
    return { id: reel.id, authorId: reel.authorId, author: formatUser(author), videoUrl: reel.videoUrl, thumbnailUrl: reel.thumbnailUrl ?? null, caption: reel.caption ?? null, sound: reel.sound ?? null, hashtags: reel.hashtags ?? [], likesCount: reel.likesCount, commentsCount: reel.commentsCount, viewsCount: reel.viewsCount, isLiked, createdAt: reel.createdAt.toISOString() };
  }));

  res.json(result);
});

router.post("/reels", requireAuth, async (req, res): Promise<void> => {
  const authorId = (req as any).userId;
  const { videoUrl, thumbnailUrl, caption, sound, hashtags = [] } = req.body;
  if (!videoUrl) { res.status(400).json({ error: "videoUrl required" }); return; }

  const [reel] = await db.insert(reelsTable).values({ authorId, videoUrl, thumbnailUrl, caption, sound, hashtags }).returning();
  const [author] = await db.select().from(usersTable).where(eq(usersTable.id, authorId)).limit(1);
  res.status(201).json({ id: reel.id, authorId: reel.authorId, author: formatUser(author), videoUrl: reel.videoUrl, thumbnailUrl: reel.thumbnailUrl ?? null, caption: reel.caption ?? null, sound: reel.sound ?? null, hashtags: reel.hashtags ?? [], likesCount: reel.likesCount, commentsCount: reel.commentsCount, viewsCount: reel.viewsCount, isLiked: false, createdAt: reel.createdAt.toISOString() });
});

router.post("/reels/:id/like", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const currentUserId = (req as any).userId;

  const existing = await db.select().from(reelLikesTable).where(and(eq(reelLikesTable.reelId, id), eq(reelLikesTable.userId, currentUserId))).limit(1);
  if (existing.length === 0) {
    await db.insert(reelLikesTable).values({ reelId: id, userId: currentUserId });
    await db.update(reelsTable).set({ likesCount: sql`${reelsTable.likesCount} + 1` }).where(eq(reelsTable.id, id));
  } else {
    await db.delete(reelLikesTable).where(and(eq(reelLikesTable.reelId, id), eq(reelLikesTable.userId, currentUserId)));
    await db.update(reelsTable).set({ likesCount: sql`${reelsTable.likesCount} - 1` }).where(eq(reelsTable.id, id));
  }
  res.json({ success: true });
});

export default router;
