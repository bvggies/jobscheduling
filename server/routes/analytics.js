const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Get analytics
router.get('/', async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    const dateFilter = start_date && end_date 
      ? `WHERE j.due_date BETWEEN '${start_date}' AND '${end_date}'`
      : '';

    // On-time completion rate
    const completionRate = await db.query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN j.status = 'Completed' AND j.due_date >= CURRENT_DATE THEN 1 ELSE 0 END) as on_time,
        SUM(CASE WHEN j.status = 'Completed' AND j.due_date < CURRENT_DATE THEN 1 ELSE 0 END) as late
      FROM jobs j
      ${dateFilter}
    `);

    // Machine utilization
    const utilization = await db.query(`
      SELECT 
        m.id,
        m.name,
        m.type,
        COUNT(j.id) as job_count,
        SUM(EXTRACT(EPOCH FROM (j.scheduled_end - j.scheduled_start))/3600) as total_hours
      FROM machines m
      LEFT JOIN jobs j ON m.id = j.machine_id AND j.status != 'Completed'
      GROUP BY m.id, m.name, m.type
      ORDER BY m.name
    `);

    // Late jobs
    const lateJobs = await db.query(`
      SELECT j.*, m.name as machine_name
      FROM jobs j
      LEFT JOIN machines m ON j.machine_id = m.id
      WHERE j.due_date < CURRENT_DATE AND j.status != 'Completed'
      ORDER BY j.due_date ASC
    `);

    // Jobs by status
    const statusBreakdown = await db.query(`
      SELECT status, COUNT(*) as count
      FROM jobs
      ${dateFilter}
      GROUP BY status
    `);

    res.json({
      completionRate: completionRate.rows[0],
      utilization: utilization.rows,
      lateJobs: lateJobs.rows,
      statusBreakdown: statusBreakdown.rows,
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

module.exports = router;

