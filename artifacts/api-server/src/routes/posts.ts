import { Router, type IRouter } from "express";
import { db, postsTable, usersTable, postLikesTable, commentsTable } from "@workspace/db";
import { eq, and, desc, count, sql, ilike } from "drizzle-orm";
import { requireAuth, optionalAuth } from "../lib/auth-middleware";

const router: IRouter = Router();

function formatUser(user: typeof usersTable.$inferSelect) {
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
    followersCount: 0,
    followingCount: 0,
    postsCount: 0,
    createdAt: user.createdAt.toISOString(),
  };
}

function formatPost(post: typeof postsTable.$inferSelect, author: typeof usersTable.$inferSelect, isLiked = false, userReaction: string | null = null) {
  return {
    id: post.id,
    authorId: post.authorId,
    author: formatUser(author),
    type: post.type,
    content: post.content ?? null,
    mediaUrls: post.mediaUrls ?? [],
    hashtags: post.hashtags ?? [],
    likesCount: post.likesCount,
    commentsCount: post.commentsCount,
    sharesCount: post.sharesCount,
    isLiked,
    userReaction,
    audience: post.audience,
    createdAt: post.createdAt.toISOString(),
  };
}

router.get("/posts", optionalAuth, async (req, res): Promise<void> => {
  const { userId, limit = "20", offset = "0" } = req.query as Record<string, string>;
  const lim = Math.min(parseInt(limit, 10) || 20, 50);
  const off = parseInt(offset, 10) || 0;
  const currentUserId = (req as any).userId;

  let rows;
  if (userId) {
    const uid = parseInt(userId, 10);
    rows = await db.select({ post: postsTable, author: usersTable })
      .from(postsTable)
      .innerJoin(usersTable, eq(postsTable.authorId, usersTable.id))
      .where(eq(postsTable.authorId, uid))
      .orderBy(desc(postsTable.createdAt))
      .limit(lim).offset(off);
  } else {
    rows = await db.select({ post: postsTable, author: usersTable })
      .from(postsTable)
      .innerJoin(usersTable, eq(postsTable.authorId, usersTable.id))
      .orderBy(desc(postsTable.createdAt))
      .limit(lim).offset(off);
  }

  const result = await Promise.all(rows.map(async ({ post, author }) => {
    let isLiked = false;
    let userReaction = null;
    if (currentUserId) {
      const [like] = await db.select().from(postLikesTable).where(and(eq(postLikesTable.postId, post.id), eq(postLikesTable.userId, currentUserId))).limit(1);
      if (like) { isLiked = true; userReaction = like.reaction; }
    }
    return formatPost(post, author, isLiked, userReaction);
  }));

  res.json(result);
});

router.get("/posts/trending", optionalAuth, async (req, res): Promise<void> => {
  const rows = await db.select({ post: postsTable, author: usersTable })
    .from(postsTable)
    .innerJoin(usersTable, eq(postsTable.authorId, usersTable.id))
    .orderBy(desc(postsTable.likesCount))
    .limit(10);

  res.json(rows.map(({ post, author }) => formatPost(post, author)));
});

router.post("/posts", requireAuth, async (req, res): Promise<void> => {
  const authorId = (req as any).userId;
  const { type = "text", content, mediaUrls = [], hashtags = [], audience = "public" } = req.body;

  const [post] = await db.insert(postsTable).values({ authorId, type, content, mediaUrls, hashtags, audience }).returning();
  const [author] = await db.select().from(usersTable).where(eq(usersTable.id, authorId)).limit(1);
  res.status(201).json(formatPost(post, author));
});

router.get("/posts/:id", optionalAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [row] = await db.select({ post: postsTable, author: usersTable })
    .from(postsTable).innerJoin(usersTable, eq(postsTable.authorId, usersTable.id))
    .where(eq(postsTable.id, id)).limit(1);
  if (!row) { res.status(404).json({ error: "Post not found" }); return; }

  const currentUserId = (req as any).userId;
  let isLiked = false;
  let userReaction = null;
  if (currentUserId) {
    const [like] = await db.select().from(postLikesTable).where(and(eq(postLikesTable.postId, id), eq(postLikesTable.userId, currentUserId))).limit(1);
    if (like) { isLiked = true; userReaction = like.reaction; }
  }

  res.json(formatPost(row.post, row.author, isLiked, userReaction));
});

router.delete("/posts/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const currentUserId = (req as any).userId;
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [post] = await db.select().from(postsTable).where(eq(postsTable.id, id)).limit(1);
  if (!post) { res.status(404).json({ error: "Post not found" }); return; }

  const currentUser = (req as any).user;
  if (post.authorId !== currentUserId && !currentUser?.isAdmin) {
    res.status(403).json({ error: "Forbidden" }); return;
  }

  await db.delete(postsTable).where(eq(postsTable.id, id));
  res.sendStatus(204);
});

router.post("/posts/:id/like", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const currentUserId = (req as any).userId;
  const { reaction = "like" } = req.body;

  const existing = await db.select().from(postLikesTable).where(and(eq(postLikesTable.postId, id), eq(postLikesTable.userId, currentUserId))).limit(1);
  if (existing.length > 0) {
    await db.update(postLikesTable).set({ reaction }).where(and(eq(postLikesTable.postId, id), eq(postLikesTable.userId, currentUserId)));
  } else {
    await db.insert(postLikesTable).values({ postId: id, userId: currentUserId, reaction });
    await db.update(postsTable).set({ likesCount: sql`${postsTable.likesCount} + 1` }).where(eq(postsTable.id, id));
  }
  res.json({ success: true });
});

router.get("/posts/:id/comments", optionalAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const rows = await db.select({ comment: commentsTable, author: usersTable })
    .from(commentsTable)
    .innerJoin(usersTable, eq(commentsTable.authorId, usersTable.id))
    .where(eq(commentsTable.postId, id))
    .orderBy(desc(commentsTable.createdAt));

  res.json(rows.map(({ comment, author }) => ({
    id: comment.id,
    postId: comment.postId,
    authorId: comment.authorId,
    author: formatUser(author),
    content: comment.content,
    parentId: comment.parentId ?? null,
    likesCount: comment.likesCount,
    createdAt: comment.createdAt.toISOString(),
  })));
});

router.post("/posts/:id/comments", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const authorId = (req as any).userId;
  const { content, parentId = null } = req.body;

  if (!content) { res.status(400).json({ error: "Content required" }); return; }

  const [comment] = await db.insert(commentsTable).values({ postId: id, authorId, content, parentId }).returning();
  await db.update(postsTable).set({ commentsCount: sql`${postsTable.commentsCount} + 1` }).where(eq(postsTable.id, id));

  const [author] = await db.select().from(usersTable).where(eq(usersTable.id, authorId)).limit(1);
  res.status(201).json({
    id: comment.id,
    postId: comment.postId,
    authorId: comment.authorId,
    author: formatUser(author),
    content: comment.content,
    parentId: comment.parentId ?? null,
    likesCount: comment.likesCount,
    createdAt: comment.createdAt.toISOString(),
  });
});

export { formatUser };
export default router;
