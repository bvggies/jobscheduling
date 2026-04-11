const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { scheduleJobs } = require('../utils/scheduler');
const { requireAuth, requireAdmin, requireAdminOrWorker } = require('../middleware/auth');
const { logJobFieldChanges } = require('../utils/jobUpdates');

router.use(requireAuth);

router.get('/', requireAdminOrWorker, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    let query = `
      SELECT j.*, m.name as machine_name, m.type as machine_type, m.compatibility
      FROM jobs j
      LEFT JOIN machines m ON j.machine_id = m.id
      WHERE j.status != 'Completed'
    `;
    const params = [];

    if (start_date) {
      query += ` AND j.scheduled_start >= $1`;
      params.push(start_date);
    }
    if (end_date) {
      query += ` AND j.scheduled_end <= $${params.length + 1}`;
      params.push(end_date);
    }

    query += ` ORDER BY j.scheduled_start ASC, j.priority DESC`;

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching schedule:', error);
    res.status(500).json({ error: 'Failed to fetch schedule' });
  }
});

router.post('/auto-schedule', requireAdmin, async (req, res) => {
  try {
    const scheduled = await scheduleJobs();
    res.json({ message: 'Jobs scheduled successfully', scheduled });
  } catch (error) {
    console.error('Error auto-scheduling:', error);
    res.status(500).json({ error: 'Failed to auto-schedule jobs' });
  }
});

router.put('/:jobId', requireAdmin, async (req, res) => {
  try {
    const { machine_id, scheduled_start, scheduled_end } = req.body;
    const before = await db.query(`SELECT * FROM jobs WHERE id = $1`, [req.params.jobId]);
    if (before.rows.length === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }
    const existing = before.rows[0];

    const result = await db.query(
      `UPDATE jobs SET
        machine_id = $1,
        scheduled_start = $2,
        scheduled_end = $3,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *`,
      [machine_id, scheduled_start, scheduled_end, req.params.jobId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const updated = result.rows[0];
    try {
      await logJobFieldChanges({
        oldRow: existing,
        newRow: updated,
        actorId: req.user.id,
        actorRole: req.user.role,
        actorName: req.user.name || req.user.email,
      });
    } catch (logErr) {
      console.error('Schedule log error:', logErr);
    }

    res.json(updated);
  } catch (error) {
    console.error('Error updating schedule:', error);
    res.status(500).json({ error: 'Failed to update schedule' });
  }
});

module.exports = router;
