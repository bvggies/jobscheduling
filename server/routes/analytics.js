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

    // On-time completion rate (considering both date and time)
    const completionRate = await db.query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE 
          WHEN j.status = 'Completed' THEN
            CASE 
              WHEN j.due_time IS NOT NULL THEN
                CASE WHEN (j.due_date::text || ' ' || j.due_time::text)::timestamp >= CURRENT_TIMESTAMP THEN 1 ELSE 0 END
              ELSE
                CASE WHEN j.due_date >= CURRENT_DATE THEN 1 ELSE 0 END
            END
          ELSE 0
        END) as on_time,
        SUM(CASE 
          WHEN j.status = 'Completed' THEN
            CASE 
              WHEN j.due_time IS NOT NULL THEN
                CASE WHEN (j.due_date::text || ' ' || j.due_time::text)::timestamp < CURRENT_TIMESTAMP THEN 1 ELSE 0 END
              ELSE
                CASE WHEN j.due_date < CURRENT_DATE THEN 1 ELSE 0 END
            END
          ELSE 0
        END) as late
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

    // Late jobs (considering both date and time)
    const lateJobs = await db.query(`
      SELECT j.*, m.name as machine_name
      FROM jobs j
      LEFT JOIN machines m ON j.machine_id = m.id
      WHERE j.status != 'Completed'
        AND (
          (j.due_time IS NOT NULL AND (j.due_date::text || ' ' || j.due_time::text)::timestamp < CURRENT_TIMESTAMP)
          OR (j.due_time IS NULL AND j.due_date < CURRENT_DATE)
        )
      ORDER BY 
        CASE 
          WHEN j.due_time IS NOT NULL THEN (j.due_date::text || ' ' || j.due_time::text)::timestamp
          ELSE j.due_date::timestamp
        END ASC
    `);

    // Jobs by status
    const statusBreakdown = await db.query(`
      SELECT status, COUNT(*) as count
      FROM jobs
      ${dateFilter}
      GROUP BY status
    `);

    // Revenue analytics
    const revenueStats = await db.query(`
      SELECT 
        COALESCE(SUM(total_cost), 0) as total_revenue,
        COALESCE(SUM(CASE WHEN payment_status = 'Paid' THEN total_cost ELSE 0 END), 0) as paid_revenue,
        COALESCE(SUM(CASE WHEN deposit_status = 'Received' THEN deposit_received ELSE 0 END), 0) as deposit_revenue,
        COALESCE(SUM(CASE WHEN payment_status = 'Paid' THEN total_cost ELSE deposit_received END), 0) as collected_revenue,
        COALESCE(SUM(CASE WHEN payment_status != 'Paid' AND deposit_status = 'Received' THEN (total_cost - deposit_received) ELSE 0 END), 0) as pending_revenue,
        COUNT(*) as total_jobs,
        COALESCE(AVG(total_cost), 0) as avg_job_value
      FROM jobs
      ${dateFilter}
    `);

    // Revenue by customer
    const revenueByCustomer = await db.query(`
      SELECT 
        customer_name,
        COUNT(*) as job_count,
        COALESCE(SUM(total_cost), 0) as total_revenue,
        COALESCE(SUM(CASE WHEN payment_status = 'Paid' THEN total_cost ELSE 0 END), 0) as paid_revenue
      FROM jobs
      ${dateFilter}
      GROUP BY customer_name
      ORDER BY total_revenue DESC
      LIMIT 10
    `);

    // Revenue by product type
    const revenueByProduct = await db.query(`
      SELECT 
        product_type,
        COUNT(*) as job_count,
        COALESCE(SUM(total_cost), 0) as total_revenue,
        COALESCE(AVG(total_cost), 0) as avg_revenue
      FROM jobs
      ${dateFilter}
      GROUP BY product_type
      ORDER BY total_revenue DESC
    `);

    // Revenue by month (last 6 months)
    const revenueByMonth = await db.query(`
      SELECT 
        TO_CHAR(created_at, 'YYYY-MM') as month,
        COUNT(*) as job_count,
        COALESCE(SUM(total_cost), 0) as total_revenue,
        COALESCE(SUM(CASE WHEN payment_status = 'Paid' THEN total_cost ELSE 0 END), 0) as paid_revenue
      FROM jobs
      WHERE created_at >= CURRENT_DATE - INTERVAL '6 months'
      GROUP BY TO_CHAR(created_at, 'YYYY-MM')
      ORDER BY month DESC
      LIMIT 6
    `);

    // Completion time analytics
    const completionTimeStats = await db.query(`
      SELECT 
        COUNT(*) as total_jobs_with_time,
        AVG(EXTRACT(EPOCH FROM (
          CASE 
            WHEN j.due_time IS NOT NULL AND j.status = 'Completed' THEN
              j.updated_at::timestamp - (j.due_date::text || ' ' || j.due_time::text)::timestamp
            ELSE NULL
          END
        )) / 3600) as avg_hours_late,
        COUNT(CASE 
          WHEN j.due_time IS NOT NULL 
            AND j.status = 'Completed' 
            AND (j.due_date::text || ' ' || j.due_time::text)::timestamp < j.updated_at::timestamp
          THEN 1 
        END) as late_completions,
        COUNT(CASE 
          WHEN j.due_time IS NOT NULL 
            AND j.status = 'Completed' 
            AND (j.due_date::text || ' ' || j.due_time::text)::timestamp >= j.updated_at::timestamp
          THEN 1 
        END) as on_time_completions
      FROM jobs j
      WHERE j.due_time IS NOT NULL
      ${dateFilter}
    `);

    // Jobs by completion time status
    const timeBasedStatus = await db.query(`
      SELECT 
        CASE 
          WHEN j.due_time IS NOT NULL AND j.status != 'Completed' THEN
            CASE 
              WHEN (j.due_date::text || ' ' || j.due_time::text)::timestamp < CURRENT_TIMESTAMP THEN 'Overdue'
              WHEN (j.due_date::text || ' ' || j.due_time::text)::timestamp <= CURRENT_TIMESTAMP + INTERVAL '2 hours' THEN 'Due Soon'
              ELSE 'On Track'
            END
          WHEN j.due_time IS NULL AND j.status != 'Completed' THEN
            CASE 
              WHEN j.due_date < CURRENT_DATE THEN 'Overdue'
              WHEN j.due_date = CURRENT_DATE THEN 'Due Today'
              ELSE 'On Track'
            END
          ELSE 'Completed'
        END as time_status,
        COUNT(*) as count
      FROM jobs j
      ${dateFilter}
      GROUP BY time_status
    `);

    res.json({
      completionRate: completionRate.rows[0],
      utilization: utilization.rows,
      lateJobs: lateJobs.rows,
      statusBreakdown: statusBreakdown.rows,
      revenue: revenueStats.rows[0],
      revenueByCustomer: revenueByCustomer.rows,
      revenueByProduct: revenueByProduct.rows,
      revenueByMonth: revenueByMonth.rows,
      completionTime: completionTimeStats.rows[0],
      timeBasedStatus: timeBasedStatus.rows,
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

module.exports = router;

