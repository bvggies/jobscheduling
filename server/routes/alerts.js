const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { checkAlerts } = require('../utils/alerts');
const { requireAuth, requireAdmin } = require('../middleware/auth');

router.get('/', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'worker') {
      return res.status(403).json({ error: 'Access denied' });
    }
    const { read } = req.query;
    let query = 'SELECT * FROM alerts WHERE 1=1';
    const params = [];

    if (req.user.role === 'admin') {
      query += ' AND recipient_user_id IS NULL';
    } else {
      query += ' AND recipient_user_id = $1';
      params.push(req.user.id);
    }

    if (read !== undefined) {
      query += ` AND read = $${params.length + 1}`;
      params.push(read === 'true');
    }

    query += ' ORDER BY created_at DESC LIMIT 100';

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

router.patch('/:id/read', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'worker') {
      return res.status(403).json({ error: 'Access denied' });
    }
    const found = await db.query(
      `SELECT id, recipient_user_id FROM alerts WHERE id = $1`,
      [req.params.id]
    );
    if (found.rows.length === 0) {
      return res.status(404).json({ error: 'Alert not found' });
    }
    const row = found.rows[0];
    if (req.user.role === 'worker') {
      if (row.recipient_user_id !== req.user.id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    } else if (req.user.role === 'admin') {
      if (row.recipient_user_id != null) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    const result = await db.query('UPDATE alerts SET read = TRUE WHERE id = $1 RETURNING *', [req.params.id]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating alert:', error);
    res.status(500).json({ error: 'Failed to update alert' });
  }
});

router.patch('/read-all', requireAuth, async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      await db.query(`UPDATE alerts SET read = TRUE WHERE read = FALSE AND recipient_user_id IS NULL`);
    } else if (req.user.role === 'worker') {
      await db.query(`UPDATE alerts SET read = TRUE WHERE read = FALSE AND recipient_user_id = $1`, [
        req.user.id,
      ]);
    } else {
      return res.status(403).json({ error: 'Access denied' });
    }
    res.json({ message: 'All matching alerts marked as read' });
  } catch (error) {
    console.error('Error updating alerts:', error);
    res.status(500).json({ error: 'Failed to update alerts' });
  }
});

router.post('/check', requireAuth, requireAdmin, async (req, res) => {
  try {
    await checkAlerts();
    res.json({ message: 'Alerts checked successfully' });
  } catch (error) {
    console.error('Error checking alerts:', error);
    res.status(500).json({ error: 'Failed to check alerts' });
  }
});

module.exports = router;
