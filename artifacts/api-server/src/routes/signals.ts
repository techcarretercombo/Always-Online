import { Router } from "express";
import { requireAuth } from "../lib/auth-middleware";

const router = Router();

interface Signal {
  id: string;
  from: number;
  to: number;
  type: "offer" | "answer" | "ice" | "reject" | "end" | "ring";
  payload: unknown;
  createdAt: number;
}

// In-memory signal store (ephemeral, cleared on restart)
const signals: Signal[] = [];

function purgeOld() {
  const cutoff = Date.now() - 60_000;
  while (signals.length > 0 && signals[0].createdAt < cutoff) signals.shift();
}

// POST /api/signals — caller sends offer/ice/etc
router.post("/", requireAuth, (req, res) => {
  const { to, type, payload } = req.body as { to: number; type: string; payload: unknown };
  if (!to || !type) return res.status(400).json({ error: "Missing fields" });
  purgeOld();
  const sig: Signal = {
    id: Math.random().toString(36).slice(2),
    from: (req as any).user.id,
    to,
    type: type as Signal["type"],
    payload,
    createdAt: Date.now(),
  };
  signals.push(sig);
  return res.status(201).json(sig);
});

// GET /api/signals?from=X — poll for signals sent TO me, optionally from a specific user
router.get("/", requireAuth, (req, res) => {
  purgeOld();
  const me = (req as any).user.id;
  const fromFilter = req.query.from ? parseInt(req.query.from as string) : null;
  const since = req.query.since ? parseInt(req.query.since as string) : 0;
  const results = signals.filter(
    s =>
      s.to === me &&
      s.createdAt > since &&
      (fromFilter === null || s.from === fromFilter)
  );
  return res.json(results);
});

// DELETE /api/signals/:id — consume a signal after processing
router.delete("/:id", requireAuth, (req, res) => {
  const idx = signals.findIndex(s => s.id === req.params.id);
  if (idx !== -1) signals.splice(idx, 1);
  return res.json({ ok: true });
});

export default router;
