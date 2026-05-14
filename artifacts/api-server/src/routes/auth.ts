import { Router, type IRouter } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { createHash, randomBytes } from "crypto";
import { logger } from "../lib/logger";

const router: IRouter = Router();

function hashPassword(password: string): string {
  const salt = "sjm_salt_2024";
  return createHash("sha256").update(password + salt).digest("hex");
}

function generateToken(userId: number): string {
  return Buffer.from(`${userId}:${randomBytes(16).toString("hex")}:${Date.now()}`).toString("base64url");
}

function formatUser(user: typeof usersTable.$inferSelect, followersCount = 0, followingCount = 0, postsCount = 0) {
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
    followersCount,
    followingCount,
    postsCount,
    createdAt: user.createdAt.toISOString(),
  };
}

router.post("/auth/register", async (req, res): Promise<void> => {
  const { fullName, username, email, password, phone, bio, avatarUrl, gender, dateOfBirth } = req.body;
  if (!fullName || !username || !email || !password) {
    res.status(400).json({ error: "fullName, username, email, and password are required" });
    return;
  }

  const existing = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (existing.length > 0) {
    res.status(400).json({ error: "Email already in use" });
    return;
  }

  const existingUsername = await db.select().from(usersTable).where(eq(usersTable.username, username)).limit(1);
  if (existingUsername.length > 0) {
    res.status(400).json({ error: "Username already taken" });
    return;
  }

  const defaultAvatars = [
    "https://api.dicebear.com/7.x/avataaars/svg?seed=" + username,
  ];

  const [user] = await db.insert(usersTable).values({
    fullName,
    username,
    email,
    passwordHash: hashPassword(password),
    phone: phone ?? null,
    bio: bio ?? null,
    avatarUrl: avatarUrl ?? defaultAvatars[0],
    gender: gender ?? null,
    dateOfBirth: dateOfBirth ?? null,
  }).returning();

  const token = generateToken(user.id);
  res.status(201).json({ user: formatUser(user), token });
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: "Email and password required" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (!user || user.passwordHash !== hashPassword(password)) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  if (user.isBanned) {
    res.status(403).json({ error: `Account banned: ${user.banReason ?? "violation of terms"}` });
    return;
  }

  const token = generateToken(user.id);
  res.json({ user: formatUser(user), token });
});

router.post("/auth/logout", async (_req, res): Promise<void> => {
  res.json({ success: true });
});

router.get("/auth/me", async (req, res): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const token = authHeader.slice(7);
  try {
    const decoded = Buffer.from(token, "base64url").toString();
    const userId = parseInt(decoded.split(":")[0], 10);
    if (isNaN(userId)) throw new Error("Invalid token");

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (!user) {
      res.status(401).json({ error: "User not found" });
      return;
    }

    res.json(formatUser(user));
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
});

export { formatUser, hashPassword };
export default router;
