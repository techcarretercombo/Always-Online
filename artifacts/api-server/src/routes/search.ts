import { Router, type IRouter } from "express";
import { db, usersTable, postsTable, groupsTable, reelsTable, productsTable } from "@workspace/db";
import { ilike, eq, desc } from "drizzle-orm";
import { optionalAuth } from "../lib/auth-middleware";

const router: IRouter = Router();

function formatUser(user: typeof usersTable.$inferSelect) {
  return { id: user.id, fullName: user.fullName, username: user.username, email: user.email, avatarUrl: user.avatarUrl ?? null, coverUrl: user.coverUrl ?? null, bio: user.bio ?? null, isVerified: user.isVerified, isAdmin: user.isAdmin, isBanned: user.isBanned, followersCount: 0, followingCount: 0, postsCount: 0, createdAt: user.createdAt.toISOString() };
}

router.get("/search", optionalAuth, async (req, res): Promise<void> => {
  const { q, type = "all" } = req.query as Record<string, string>;
  if (!q) { res.status(400).json({ error: "q required" }); return; }

  const pattern = `%${q}%`;

  let users: ReturnType<typeof formatUser>[] = [];
  let posts: any[] = [];
  let groups: any[] = [];
  let reels: any[] = [];
  let products: any[] = [];

  if (type === "all" || type === "users") {
    const userRows = await db.select().from(usersTable).where(ilike(usersTable.username, pattern)).limit(10);
    users = userRows.map(formatUser);
  }
  if (type === "all" || type === "posts") {
    const postRows = await db.select({ post: postsTable, author: usersTable })
      .from(postsTable).innerJoin(usersTable, eq(postsTable.authorId, usersTable.id))
      .where(ilike(postsTable.content, pattern)).limit(10);
    posts = postRows.map(({ post, author }) => ({ id: post.id, authorId: post.authorId, author: formatUser(author), type: post.type, content: post.content ?? null, mediaUrls: post.mediaUrls ?? [], hashtags: post.hashtags ?? [], likesCount: post.likesCount, commentsCount: post.commentsCount, sharesCount: post.sharesCount, isLiked: false, userReaction: null, audience: post.audience, createdAt: post.createdAt.toISOString() }));
  }
  if (type === "all" || type === "groups") {
    const groupRows = await db.select().from(groupsTable).where(ilike(groupsTable.name, pattern)).limit(10);
    groups = groupRows.map(g => ({ id: g.id, name: g.name, description: g.description ?? null, avatarUrl: g.avatarUrl ?? null, coverUrl: g.coverUrl ?? null, isPrivate: g.isPrivate, membersCount: g.membersCount, postsCount: g.postsCount, isMember: false, createdAt: g.createdAt.toISOString() }));
  }
  if (type === "all" || type === "reels") {
    const reelRows = await db.select({ reel: reelsTable, author: usersTable })
      .from(reelsTable).innerJoin(usersTable, eq(reelsTable.authorId, usersTable.id))
      .where(ilike(reelsTable.caption, pattern)).limit(10);
    reels = reelRows.map(({ reel, author }) => ({ id: reel.id, authorId: reel.authorId, author: formatUser(author), videoUrl: reel.videoUrl, thumbnailUrl: reel.thumbnailUrl ?? null, caption: reel.caption ?? null, sound: reel.sound ?? null, hashtags: reel.hashtags ?? [], likesCount: reel.likesCount, commentsCount: reel.commentsCount, viewsCount: reel.viewsCount, isLiked: false, createdAt: reel.createdAt.toISOString() }));
  }
  if (type === "all" || type === "products") {
    const productRows = await db.select({ product: productsTable, seller: usersTable })
      .from(productsTable).innerJoin(usersTable, eq(productsTable.sellerId, usersTable.id))
      .where(ilike(productsTable.title, pattern)).limit(10);
    products = productRows.map(({ product, seller }) => ({ id: product.id, sellerId: product.sellerId, seller: formatUser(seller), title: product.title, description: product.description ?? null, price: parseFloat(product.price as string), category: product.category, imageUrls: product.imageUrls ?? [], condition: product.condition, location: product.location ?? null, isAvailable: product.isAvailable, viewsCount: product.viewsCount, createdAt: product.createdAt.toISOString() }));
  }

  const total = users.length + posts.length + groups.length + reels.length + products.length;
  res.json({ users, posts, groups, reels, products, total });
});

export default router;
