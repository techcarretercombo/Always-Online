import { Router, type IRouter } from "express";
import { db, usersTable, followsTable, postsTable } from "@workspace/db";
import { eq, like, and, sql, count } from "drizzle-orm";
import { requireAuth, optionalAuth } from "../lib/auth-middleware";

const router: IRouter = Router();

function formatUser(user: typeof usersTable.$inferSelect, extra?: { followersCount?: number; followingCount?: number; postsCount?: number; isFollowing?: boolean }) {
  return {
    id: user.id,
    fullName: user.fullName,
    username: user.username,
    email: user.email,
    avatarUrl: user.avatarUrl ?? null,
    coverUrl: user.coverUrl ?? null,
    bio: user.bio ?? null,
    isVerified: user.isVerified,
    isAdmin: user.isAdmin,
    isBanned: user.isBanned,
    followersCount: extra?.followersCount ?? 0,
    followingCount: extra?.followingCount ?? 0,
    postsCount: extra?.postsCount ?? 0,
    createdAt: user.createdAt.toISOString(),
    ...(extra?.isFollowing !== undefined ? { isFollowing: extra.isFollowing } : {}),
  };
}

async function getUserStats(userId: number) {
  const [followerResult] = await db.select({ cnt: count() }).from(followsTable).where(eq(followsTable.followingId, userId));
  const [followingResult] = await db.select({ cnt: count() }).from(followsTable).where(eq(followsTable.followerId, userId));
  const [postsResult] = await db.select({ cnt: count() }).from(postsTable).where(eq(postsTable.authorId, userId));
  return {
    followersCount: followerResult.cnt,
    followingCount: followingResult.cnt,
    postsCount: postsResult.cnt,
  };
}

router.get("/users", optionalAuth, async (req, res): Promise<void> => {
  const { search, limit = "20", offset = "0" } = req.query as Record<string, string>;
  const lim = Math.min(parseInt(limit, 10) || 20, 50);
  const off = parseInt(offset, 10) || 0;

  let users;
  if (search) {
    users = await db.select().from(usersTable)
      .where(like(usersTable.username, `%${search}%`))
      .limit(lim).offset(off);
  } else {
    users = await db.select().from(usersTable).limit(lim).offset(off);
  }

  res.json(users.map(u => formatUser(u)));
});

router.get("/users/:id", optionalAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const stats = await getUserStats(user.id);
  const currentUserId = (req as any).userId;
  let isFollowing = false;
  if (currentUserId) {
    const [follow] = await db.select().from(followsTable).where(and(eq(followsTable.followerId, currentUserId), eq(followsTable.followingId, id))).limit(1);
    isFollowing = !!follow;
  }

  res.json(formatUser(user, { ...stats, isFollowing }));
});

router.patch("/users/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const currentUserId = (req as any).userId;
  if (currentUserId !== id) { res.status(403).json({ error: "Forbidden" }); return; }

  const { fullName, bio, avatarUrl, coverUrl, phone } = req.body;
  const updates: Record<string, unknown> = {};
  if (fullName !== undefined) updates.fullName = fullName;
  if (bio !== undefined) updates.bio = bio;
  if (avatarUrl !== undefined) updates.avatarUrl = avatarUrl;
  if (coverUrl !== undefined) updates.coverUrl = coverUrl;
  if (phone !== undefined) updates.phone = phone;

  const [updated] = await db.update(usersTable).set(updates).where(eq(usersTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "User not found" }); return; }

  const stats = await getUserStats(updated.id);
  res.json(formatUser(updated, stats));
});

router.post("/users/:id/follow", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const currentUserId = (req as any).userId;
  if (isNaN(id) || currentUserId === id) { res.status(400).json({ error: "Invalid" }); return; }

  const existing = await db.select().from(followsTable).where(and(eq(followsTable.followerId, currentUserId), eq(followsTable.followingId, id))).limit(1);
  if (existing.length === 0) {
    await db.insert(followsTable).values({ followerId: currentUserId, followingId: id });
  }
  res.json({ success: true });
});

router.post("/users/:id/unfollow", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const currentUserId = (req as any).userId;
  if (isNaN(id)) { res.status(400).json({ error: "Invalid" }); return; }

  await db.delete(followsTable).where(and(eq(followsTable.followerId, currentUserId), eq(followsTable.followingId, id)));
  res.json({ success: true });
});

router.get("/users/:id/followers", optionalAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const followers = await db.select({ user: usersTable }).from(followsTable)
    .innerJoin(usersTable, eq(followsTable.followerId, usersTable.id))
    .where(eq(followsTable.followingId, id));

  res.json(followers.map(f => formatUser(f.user)));
});

router.get("/users/:id/following", optionalAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const following = await db.select({ user: usersTable }).from(followsTable)
    .innerJoin(usersTable, eq(followsTable.followingId, usersTable.id))
    .where(eq(followsTable.followerId, id));

  res.json(following.map(f => formatUser(f.user)));
});

export { formatUser };
export default router;
