const express = require('express');
const db = require('../config/database');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      const result = await db.query(
        `SELECT f.*, u.email as user_email, u.name as user_name
         FROM feedback f
         JOIN users u ON u.id = f.user_id
         ORDER BY f.created_at DESC`
      );
      return res.json(result.rows);
    }
    const result = await db.query(
      `SELECT * FROM feedback WHERE user_id = $1 ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Feedback list error:', error);
    res.status(500).json({ error: 'Failed to load feedback' });
  }
});

router.post('/', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'customer') {
      return res.status(403).json({ error: 'Only customers can submit feedback here' });
    }
    const { subject, message } = req.body;
    if (!subject || !message) {
      return res.status(400).json({ error: 'Subject and message are required' });
    }
    const result = await db.query(
      `INSERT INTO feedback (user_id, subject, message, status)
       VALUES ($1, $2, $3, 'open') RETURNING *`,
      [req.user.id, String(subject).trim(), String(message).trim()]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Feedback create error:', error);
    res.status(500).json({ error: 'Failed to submit feedback' });
  }
});

router.patch('/:id/reply', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { admin_reply } = req.body;
    if (!admin_reply || !String(admin_reply).trim()) {
      return res.status(400).json({ error: 'Reply text is required' });
    }
    const result = await db.query(
      `UPDATE feedback SET
        admin_reply = $1,
        status = 'answered',
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [String(admin_reply).trim(), req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Feedback not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Feedback reply error:', error);
    res.status(500).json({ error: 'Failed to save reply' });
  }
});

router.patch('/:id/status', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['open', 'answered', 'closed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    const result = await db.query(
      `UPDATE feedback SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
      [status, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Feedback not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Feedback status error:', error);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

module.exports = router;
