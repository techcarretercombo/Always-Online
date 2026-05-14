import { Router, type IRouter } from "express";
import { db, groupsTable, groupMembersTable, usersTable } from "@workspace/db";
import { eq, and, ilike, desc, sql } from "drizzle-orm";
import { requireAuth, optionalAuth } from "../lib/auth-middleware";

const router: IRouter = Router();

function formatGroup(group: typeof groupsTable.$inferSelect, isMember = false) {
  return { id: group.id, name: group.name, description: group.description ?? null, avatarUrl: group.avatarUrl ?? null, coverUrl: group.coverUrl ?? null, isPrivate: group.isPrivate, membersCount: group.membersCount, postsCount: group.postsCount, isMember, createdAt: group.createdAt.toISOString() };
}

router.get("/groups", optionalAuth, async (req, res): Promise<void> => {
  const { search, limit = "20" } = req.query as Record<string, string>;
  const lim = Math.min(parseInt(limit, 10) || 20, 50);
  const currentUserId = (req as any).userId;

  let groups;
  if (search) {
    groups = await db.select().from(groupsTable).where(ilike(groupsTable.name, `%${search}%`)).limit(lim);
  } else {
    groups = await db.select().from(groupsTable).orderBy(desc(groupsTable.membersCount)).limit(lim);
  }

  const result = await Promise.all(groups.map(async (group) => {
    let isMember = false;
    if (currentUserId) {
      const [m] = await db.select().from(groupMembersTable).where(and(eq(groupMembersTable.groupId, group.id), eq(groupMembersTable.userId, currentUserId))).limit(1);
      isMember = !!m;
    }
    return formatGroup(group, isMember);
  }));

  res.json(result);
});

router.post("/groups", requireAuth, async (req, res): Promise<void> => {
  const creatorId = (req as any).userId;
  const { name, description, avatarUrl, isPrivate = false } = req.body;
  if (!name) { res.status(400).json({ error: "name required" }); return; }

  const [group] = await db.insert(groupsTable).values({ name, description, avatarUrl, isPrivate, creatorId, membersCount: 1 }).returning();
  await db.insert(groupMembersTable).values({ groupId: group.id, userId: creatorId, role: "admin" });
  res.status(201).json(formatGroup(group, true));
});

router.get("/groups/:id", optionalAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const currentUserId = (req as any).userId;

  const [group] = await db.select().from(groupsTable).where(eq(groupsTable.id, id)).limit(1);
  if (!group) { res.status(404).json({ error: "Group not found" }); return; }

  let isMember = false;
  if (currentUserId) {
    const [m] = await db.select().from(groupMembersTable).where(and(eq(groupMembersTable.groupId, id), eq(groupMembersTable.userId, currentUserId))).limit(1);
    isMember = !!m;
  }
  res.json(formatGroup(group, isMember));
});

router.post("/groups/:id/join", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const currentUserId = (req as any).userId;

  const existing = await db.select().from(groupMembersTable).where(and(eq(groupMembersTable.groupId, id), eq(groupMembersTable.userId, currentUserId))).limit(1);
  if (existing.length === 0) {
    await db.insert(groupMembersTable).values({ groupId: id, userId: currentUserId });
    await db.update(groupsTable).set({ membersCount: sql`${groupsTable.membersCount} + 1` }).where(eq(groupsTable.id, id));
  }
  res.json({ success: true });
});

export default router;
