const express = require('express');
const db = require('../config/database');
const { requireAuth, requireAdminOrWorker } = require('../middleware/auth');

const router = express.Router();

router.get('/mine', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'customer') {
      return res.status(403).json({ error: 'Customer access only' });
    }
    const limit = Math.min(parseInt(req.query.limit, 10) || 25, 100);
    const result = await db.query(
      `SELECT u.id, u.job_id, u.actor_role, u.actor_name, u.kind, u.summary, u.body, u.created_at,
              j.job_name
       FROM job_updates u
       JOIN jobs j ON j.id = u.job_id
       WHERE j.user_id = $1
       ORDER BY u.created_at DESC
       LIMIT $2`,
      [req.user.id, limit]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Activity mine error:', error);
    res.status(500).json({ error: 'Failed to load updates' });
  }
});

router.get('/recent', requireAuth, requireAdminOrWorker, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    const result = await db.query(
      `SELECT u.id, u.job_id, u.actor_id, u.actor_role, u.actor_name, u.kind, u.summary, u.body, u.created_at,
              j.job_name, j.user_id AS assigned_customer_id
       FROM job_updates u
       JOIN jobs j ON j.id = u.job_id
       ORDER BY u.created_at DESC
       LIMIT $1`,
      [limit]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Activity recent error:', error);
    res.status(500).json({ error: 'Failed to load activity' });
  }
});

module.exports = router;
