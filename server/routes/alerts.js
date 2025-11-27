const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { checkAlerts } = require('../utils/alerts');

// Get all alerts
router.get('/', async (req, res) => {
  try {
    const { read } = req.query;
    let query = 'SELECT * FROM alerts';
    const params = [];

    if (read !== undefined) {
      query += ` WHERE read = $1`;
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

// Mark alert as read
router.patch('/:id/read', async (req, res) => {
  try {
    const result = await db.query(
      'UPDATE alerts SET read = TRUE WHERE id = $1 RETURNING *',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Alert not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating alert:', error);
    res.status(500).json({ error: 'Failed to update alert' });
  }
});

// Mark all alerts as read
router.patch('/read-all', async (req, res) => {
  try {
    await db.query('UPDATE alerts SET read = TRUE WHERE read = FALSE');
    res.json({ message: 'All alerts marked as read' });
  } catch (error) {
    console.error('Error updating alerts:', error);
    res.status(500).json({ error: 'Failed to update alerts' });
  }
});

// Check for new alerts
router.post('/check', async (req, res) => {
  try {
    await checkAlerts();
    res.json({ message: 'Alerts checked successfully' });
  } catch (error) {
    console.error('Error checking alerts:', error);
    res.status(500).json({ error: 'Failed to check alerts' });
  }
});

module.exports = router;

