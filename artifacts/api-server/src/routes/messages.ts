import { Router, type IRouter } from "express";
import { db, conversationsTable, conversationParticipantsTable, messagesTable, usersTable } from "@workspace/db";
import { eq, and, desc, count, inArray } from "drizzle-orm";
import { requireAuth } from "../lib/auth-middleware";

const router: IRouter = Router();

function formatUser(user: typeof usersTable.$inferSelect) {
  return { id: user.id, fullName: user.fullName, username: user.username, email: user.email, avatarUrl: user.avatarUrl ?? null, coverUrl: user.coverUrl ?? null, bio: user.bio ?? null, isVerified: user.isVerified, isAdmin: user.isAdmin, isBanned: user.isBanned, followersCount: 0, followingCount: 0, postsCount: 0, createdAt: user.createdAt.toISOString() };
}

router.get("/conversations", requireAuth, async (req, res): Promise<void> => {
  const currentUserId = (req as any).userId;

  const myConvs = await db.select({ conversationId: conversationParticipantsTable.conversationId })
    .from(conversationParticipantsTable)
    .where(eq(conversationParticipantsTable.userId, currentUserId));

  if (myConvs.length === 0) { res.json([]); return; }

  const convIds = myConvs.map(c => c.conversationId);
  const convs = await db.select().from(conversationsTable).where(inArray(conversationsTable.id, convIds));

  const result = await Promise.all(convs.map(async (conv) => {
    const participants = await db.select({ user: usersTable })
      .from(conversationParticipantsTable)
      .innerJoin(usersTable, eq(conversationParticipantsTable.userId, usersTable.id))
      .where(eq(conversationParticipantsTable.conversationId, conv.id));

    const [lastMsg] = await db.select({ msg: messagesTable, sender: usersTable })
      .from(messagesTable)
      .innerJoin(usersTable, eq(messagesTable.senderId, usersTable.id))
      .where(eq(messagesTable.conversationId, conv.id))
      .orderBy(desc(messagesTable.createdAt)).limit(1);

    const [unreadResult] = await db.select({ cnt: count() }).from(messagesTable)
      .where(and(eq(messagesTable.conversationId, conv.id), eq(messagesTable.isRead, false)));

    const lastMessage = lastMsg ? { id: lastMsg.msg.id, conversationId: lastMsg.msg.conversationId, senderId: lastMsg.msg.senderId, sender: formatUser(lastMsg.sender), content: lastMsg.msg.content, type: lastMsg.msg.type, mediaUrl: lastMsg.msg.mediaUrl ?? null, isRead: lastMsg.msg.isRead, isDeleted: lastMsg.msg.isDeleted, createdAt: lastMsg.msg.createdAt.toISOString() } : undefined;

    return { id: conv.id, participants: participants.map(p => formatUser(p.user)), isGroup: conv.isGroup, groupName: conv.groupName ?? null, groupAvatarUrl: conv.groupAvatarUrl ?? null, lastMessage, unreadCount: unreadResult.cnt, createdAt: conv.createdAt.toISOString() };
  }));

  res.json(result);
});

router.post("/conversations", requireAuth, async (req, res): Promise<void> => {
  const currentUserId = (req as any).userId;
  const { participantIds, isGroup = false, groupName } = req.body;
  if (!participantIds?.length) { res.status(400).json({ error: "participantIds required" }); return; }

  const allParticipants = [...new Set([currentUserId, ...participantIds])];

  const [conv] = await db.insert(conversationsTable).values({ isGroup, groupName }).returning();
  await Promise.all(allParticipants.map(uid => db.insert(conversationParticipantsTable).values({ conversationId: conv.id, userId: uid })));

  const participants = await db.select({ user: usersTable })
    .from(conversationParticipantsTable)
    .innerJoin(usersTable, eq(conversationParticipantsTable.userId, usersTable.id))
    .where(eq(conversationParticipantsTable.conversationId, conv.id));

  res.status(201).json({ id: conv.id, participants: participants.map(p => formatUser(p.user)), isGroup: conv.isGroup, groupName: conv.groupName ?? null, groupAvatarUrl: conv.groupAvatarUrl ?? null, lastMessage: undefined, unreadCount: 0, createdAt: conv.createdAt.toISOString() });
});

router.get("/conversations/:id/messages", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const rows = await db.select({ msg: messagesTable, sender: usersTable })
    .from(messagesTable)
    .innerJoin(usersTable, eq(messagesTable.senderId, usersTable.id))
    .where(eq(messagesTable.conversationId, id))
    .orderBy(desc(messagesTable.createdAt))
    .limit(50);

  res.json(rows.map(({ msg, sender }) => ({ id: msg.id, conversationId: msg.conversationId, senderId: msg.senderId, sender: formatUser(sender), content: msg.content, type: msg.type, mediaUrl: msg.mediaUrl ?? null, isRead: msg.isRead, isDeleted: msg.isDeleted, createdAt: msg.createdAt.toISOString() })));
});

router.post("/conversations/:id/messages", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const senderId = (req as any).userId;
  const { content, type = "text", mediaUrl } = req.body;
  if (!content) { res.status(400).json({ error: "Content required" }); return; }

  const [msg] = await db.insert(messagesTable).values({ conversationId: id, senderId, content, type, mediaUrl }).returning();
  const [sender] = await db.select().from(usersTable).where(eq(usersTable.id, senderId)).limit(1);
  res.status(201).json({ id: msg.id, conversationId: msg.conversationId, senderId: msg.senderId, sender: formatUser(sender), content: msg.content, type: msg.type, mediaUrl: msg.mediaUrl ?? null, isRead: msg.isRead, isDeleted: msg.isDeleted, createdAt: msg.createdAt.toISOString() });
});

export default router;
