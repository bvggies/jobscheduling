const db = require('../config/database');

// Create an alert
const createAlert = async (type, message, jobId = null, machineId = null, severity = 'info') => {
  try {
    await db.query(
      `INSERT INTO alerts (type, message, job_id, machine_id, severity)
       VALUES ($1, $2, $3, $4, $5)`,
      [type, message, jobId, machineId, severity]
    );
  } catch (error) {
    console.error('Error creating alert:', error);
  }
};

// Check for alerts
const checkAlerts = async () => {
  try {
    // Check for jobs at risk of missing due date (within 24 hours and not completed)
    const atRiskJobs = await db.query(`
      SELECT * FROM jobs
      WHERE status != 'Completed'
      AND due_date <= CURRENT_DATE + INTERVAL '1 day'
      AND due_date >= CURRENT_DATE
    `);

    for (const job of atRiskJobs.rows) {
      // Check if alert already exists
      const existingAlert = await db.query(`
        SELECT id FROM alerts
        WHERE type = 'at_risk'
        AND job_id = $1
        AND created_at > CURRENT_DATE - INTERVAL '1 day'
      `, [job.id]);

      if (existingAlert.rows.length === 0) {
        await createAlert(
          'at_risk',
          `Job "${job.job_name}" is at risk of missing its due date (${job.due_date})`,
          job.id,
          null,
          'warning'
        );
      }
    }

    // Check for machines with no jobs scheduled for next 2 hours
    const machines = await db.query('SELECT * FROM machines');
    const twoHoursFromNow = new Date(Date.now() + 2 * 60 * 60 * 1000);

    for (const machine of machines.rows) {
      const upcomingJobs = await db.query(`
        SELECT * FROM jobs
        WHERE machine_id = $1
        AND status != 'Completed'
        AND scheduled_start <= $2
        AND scheduled_start >= CURRENT_TIMESTAMP
      `, [machine.id, twoHoursFromNow]);

      if (upcomingJobs.rows.length === 0) {
        // Check if alert already exists
        const existingAlert = await db.query(`
          SELECT id FROM alerts
          WHERE type = 'underutilization'
          AND machine_id = $1
          AND created_at > CURRENT_TIMESTAMP - INTERVAL '2 hours'
        `, [machine.id]);

        if (existingAlert.rows.length === 0) {
          await createAlert(
            'underutilization',
            `Machine "${machine.name}" has no jobs scheduled for the next 2 hours`,
            null,
            machine.id,
            'info'
          );
        }
      }
    }

    // Check for late jobs
    const lateJobs = await db.query(`
      SELECT * FROM jobs
      WHERE status != 'Completed'
      AND due_date < CURRENT_DATE
    `);

    for (const job of lateJobs.rows) {
      const existingAlert = await db.query(`
        SELECT id FROM alerts
        WHERE type = 'late'
        AND job_id = $1
        AND created_at > CURRENT_DATE - INTERVAL '1 day'
      `, [job.id]);

      if (existingAlert.rows.length === 0) {
        await createAlert(
          'late',
          `Job "${job.job_name}" is past its due date (${job.due_date})`,
          job.id,
          null,
          'error'
        );
      }
    }
  } catch (error) {
    console.error('Error checking alerts:', error);
    throw error;
  }
};

module.exports = {
  createAlert,
  checkAlerts,
};

