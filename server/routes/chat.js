const express = require('express');
const db = require('../config/database');
const { requireAuth } = require('../middleware/auth');
const { getChatIO } = require('../chatSocket');

const router = express.Router();
router.use(requireAuth);

function normalizePair(id1, id2) {
  const a = Number(id1);
  const b = Number(id2);
  return a < b ? [a, b] : [b, a];
}

async function validateChatPair(me, peerId) {
  const peer = await db.query(`SELECT id, role FROM users WHERE id = $1`, [peerId]);
  if (!peer.rows.length) {
    return { ok: false, status: 404, error: 'User not found' };
  }
  const pr = peer.rows[0].role;
  if (me.role === 'admin') {
    if (pr !== 'worker' && pr !== 'customer') {
      return { ok: false, status: 400, error: 'You can only start chats with workers or customers' };
    }
  } else if (me.role === 'worker' || me.role === 'customer') {
    if (pr !== 'admin') {
      return { ok: false, status: 400, error: 'You can only message an administrator' };
    }
  } else {
    return { ok: false, status: 403, error: 'Chat is not available for this account' };
  }
  return { ok: true };
}

async function getOrCreateThread(userId1, userId2) {
  const [low, high] = normalizePair(userId1, userId2);
  let r = await db.query(
    `INSERT INTO chat_threads (user_id_a, user_id_b) VALUES ($1, $2)
     ON CONFLICT (user_id_a, user_id_b) DO NOTHING RETURNING id`,
    [low, high]
  );
  if (r.rows.length === 0) {
    r = await db.query(`SELECT id FROM chat_threads WHERE user_id_a = $1 AND user_id_b = $2`, [low, high]);
  }
  const threadId = r.rows[0].id;
  await db.query(
    `INSERT INTO chat_thread_reads (thread_id, user_id) VALUES ($1, $2), ($1, $3)
     ON CONFLICT (thread_id, user_id) DO NOTHING`,
    [threadId, low, high]
  );
  return threadId;
}

async function assertThreadMember(threadId, userId) {
  const r = await db.query(
    `SELECT id FROM chat_threads WHERE id = $1 AND (user_id_a = $2 OR user_id_b = $2)`,
    [threadId, userId]
  );
  return r.rows.length > 0;
}

function emitChatMessage(threadId, payload) {
  const io = getChatIO();
  if (!io) return;
  io.to(`thread:${threadId}`).emit('chat:message', payload);
  const { recipientIds } = payload;
  if (Array.isArray(recipientIds)) {
    recipientIds.forEach((uid) => {
      io.to(`user:${uid}`).emit('chat:inbox', { threadId, preview: payload.message });
    });
  }
}

/** List threads for the signed-in user */
router.get('/threads', async (req, res) => {
  try {
    const me = req.user.id;
    const result = await db.query(
      `
      SELECT
        t.id AS thread_id,
        t.updated_at,
        CASE WHEN t.user_id_a = $1 THEN t.user_id_b ELSE t.user_id_a END AS peer_id,
        u.name AS peer_name,
        u.role AS peer_role,
        lm.body AS last_message_body,
        lm.created_at AS last_message_at,
        (
          SELECT COUNT(*)::int FROM chat_messages m
          WHERE m.thread_id = t.id
            AND m.sender_id <> $1
            AND m.created_at > COALESCE(r.last_read_at, TIMESTAMP '1970-01-01')
        ) AS unread_count
      FROM chat_threads t
      JOIN users u ON u.id = (CASE WHEN t.user_id_a = $1 THEN t.user_id_b ELSE t.user_id_a END)
      LEFT JOIN chat_thread_reads r ON r.thread_id = t.id AND r.user_id = $1
      LEFT JOIN LATERAL (
        SELECT body, created_at FROM chat_messages cm
        WHERE cm.thread_id = t.id ORDER BY cm.created_at DESC LIMIT 1
      ) lm ON TRUE
      WHERE t.user_id_a = $1 OR t.user_id_b = $1
      ORDER BY t.updated_at DESC NULLS LAST
      `,
      [me]
    );
    res.json(result.rows);
  } catch (e) {
    console.error('chat threads list', e);
    res.status(500).json({ error: 'Failed to load conversations' });
  }
});

/** Open or create thread with a specific user (peer_user_id) */
router.post('/threads', async (req, res) => {
  try {
    const peerId = parseInt(req.body?.peer_user_id, 10);
    if (Number.isNaN(peerId)) {
      return res.status(400).json({ error: 'peer_user_id is required' });
    }
    if (peerId === req.user.id) {
      return res.status(400).json({ error: 'Cannot open a chat with yourself' });
    }
    const v = await validateChatPair(req.user, peerId);
    if (!v.ok) return res.status(v.status).json({ error: v.error });
    const threadId = await getOrCreateThread(req.user.id, peerId);
    res.status(201).json({ thread_id: threadId });
  } catch (e) {
    console.error('chat thread open', e);
    res.status(500).json({ error: 'Failed to open conversation' });
  }
});

/** For workers/customers: open thread with primary admin (lowest id) */
router.post('/threads/shop', async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      return res.status(400).json({ error: 'Use POST /threads with peer_user_id' });
    }
    const admin = await db.query(`SELECT id FROM users WHERE role = 'admin' ORDER BY id ASC LIMIT 1`);
    if (!admin.rows.length) {
      return res.status(503).json({ error: 'No administrator is available for chat yet' });
    }
    const peerId = admin.rows[0].id;
    const v = await validateChatPair(req.user, peerId);
    if (!v.ok) return res.status(v.status).json({ error: v.error });
    const threadId = await getOrCreateThread(req.user.id, peerId);
    res.status(201).json({ thread_id: threadId });
  } catch (e) {
    console.error('chat shop thread', e);
    res.status(500).json({ error: 'Failed to open shop chat' });
  }
});

router.get('/threads/:threadId/messages', async (req, res) => {
  try {
    const threadId = parseInt(req.params.threadId, 10);
    if (Number.isNaN(threadId)) return res.status(400).json({ error: 'Invalid thread' });
    const ok = await assertThreadMember(threadId, req.user.id);
    if (!ok) return res.status(403).json({ error: 'Access denied' });

    const limit = Math.min(parseInt(req.query.limit, 10) || 80, 200);
    const beforeId = req.query.before ? parseInt(req.query.before, 10) : null;

    let query = `
      SELECT m.id, m.thread_id, m.sender_id, m.body, m.created_at, u.name AS sender_name, u.role AS sender_role
      FROM chat_messages m
      JOIN users u ON u.id = m.sender_id
      WHERE m.thread_id = $1
    `;
    const params = [threadId];
    if (beforeId && !Number.isNaN(beforeId)) {
      query += ` AND m.id < $2`;
      params.push(beforeId);
    }
    query += ` ORDER BY m.created_at DESC, m.id DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await db.query(query, params);
    res.json(result.rows.reverse());
  } catch (e) {
    console.error('chat messages', e);
    res.status(500).json({ error: 'Failed to load messages' });
  }
});

router.post('/threads/:threadId/messages', async (req, res) => {
  try {
    const threadId = parseInt(req.params.threadId, 10);
    if (Number.isNaN(threadId)) return res.status(400).json({ error: 'Invalid thread' });
    const ok = await assertThreadMember(threadId, req.user.id);
    if (!ok) return res.status(403).json({ error: 'Access denied' });

    const body = String(req.body?.body || '').trim();
    if (!body) return res.status(400).json({ error: 'Message cannot be empty' });
    if (body.length > 8000) return res.status(400).json({ error: 'Message is too long' });

    const trow = await db.query(`SELECT user_id_a, user_id_b FROM chat_threads WHERE id = $1`, [threadId]);
    const { user_id_a: ua, user_id_b: ub } = trow.rows[0];
    const recipientIds = [ua, ub].filter((id) => id !== req.user.id);

    const ins = await db.query(
      `INSERT INTO chat_messages (thread_id, sender_id, body) VALUES ($1, $2, $3) RETURNING id, thread_id, sender_id, body, created_at`,
      [threadId, req.user.id, body]
    );
    const row = ins.rows[0];
    await db.query(`UPDATE chat_threads SET updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [threadId]);

    const u = await db.query(`SELECT name, role FROM users WHERE id = $1`, [req.user.id]);
    const message = {
      id: row.id,
      thread_id: row.thread_id,
      sender_id: row.sender_id,
      body: row.body,
      created_at: row.created_at,
      sender_name: u.rows[0]?.name,
      sender_role: u.rows[0]?.role,
    };

    emitChatMessage(threadId, { message, recipientIds });

    res.status(201).json(message);
  } catch (e) {
    console.error('chat send', e);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

router.patch('/threads/:threadId/read', async (req, res) => {
  try {
    const threadId = parseInt(req.params.threadId, 10);
    if (Number.isNaN(threadId)) return res.status(400).json({ error: 'Invalid thread' });
    const ok = await assertThreadMember(threadId, req.user.id);
    if (!ok) return res.status(403).json({ error: 'Access denied' });

    await db.query(
      `INSERT INTO chat_thread_reads (thread_id, user_id, last_read_at)
       VALUES ($1, $2, CURRENT_TIMESTAMP)
       ON CONFLICT (thread_id, user_id) DO UPDATE SET last_read_at = CURRENT_TIMESTAMP`,
      [threadId, req.user.id]
    );
    res.json({ ok: true });
  } catch (e) {
    console.error('chat read', e);
    res.status(500).json({ error: 'Failed to mark read' });
  }
});

module.exports = router;
