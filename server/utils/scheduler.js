const db = require('../config/database');

// Estimate job duration in hours (simplified - can be enhanced)
const estimateJobDuration = (quantity, productType) => {
  const baseHours = {
    'business card': 0.5,
    'brochure': 1,
    'poster': 1.5,
    'booklet': 2,
    'flyer': 0.5,
    'banner': 2,
    'label': 1,
  };
  const base = baseHours[productType.toLowerCase()] || 1;
  return base + (quantity / 1000) * 0.5; // Add time based on quantity
};

// Check if machine is compatible with job
const isCompatible = (machineCompatibility, jobSubstrate) => {
  if (!machineCompatibility || machineCompatibility.length === 0) return true;
  return machineCompatibility.some(comp => 
    jobSubstrate.toLowerCase().includes(comp.toLowerCase()) ||
    comp.toLowerCase().includes(jobSubstrate.toLowerCase())
  );
};

// Group jobs by substrate and finishing for minimal changeovers
const groupJobsBySubstrate = (jobs) => {
  const groups = {};
  jobs.forEach(job => {
    const key = `${job.substrate}_${(job.finishing || []).join('_')}`;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(job);
  });
  return groups;
};

// Schedule jobs automatically
const scheduleJobs = async () => {
  try {
    // Get all unscheduled jobs that are ready
    const jobsResult = await db.query(`
      SELECT * FROM jobs
      WHERE status IN ('Not Started', 'Ready')
      AND deposit_status = 'Received'
      AND machine_id IS NULL
      ORDER BY 
        CASE priority
          WHEN 'Rush' THEN 1
          WHEN 'High' THEN 2
          WHEN 'Medium' THEN 3
          WHEN 'Low' THEN 4
        END,
        due_date ASC
    `);

    const jobs = jobsResult.rows;
    if (jobs.length === 0) {
      return { scheduled: 0, message: 'No jobs to schedule' };
    }

    // Get all machines
    const machinesResult = await db.query('SELECT * FROM machines ORDER BY name');
    const machines = machinesResult.rows;

    if (machines.length === 0) {
      throw new Error('No machines available');
    }

    // Group jobs by substrate for minimal changeovers
    const groupedJobs = groupJobsBySubstrate(jobs);
    const scheduled = [];

    // Schedule each group
    for (const [key, jobGroup] of Object.entries(groupedJobs)) {
      // Sort group by priority and due date
      jobGroup.sort((a, b) => {
        const priorityOrder = { 'Rush': 1, 'High': 2, 'Medium': 3, 'Low': 4 };
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
        return new Date(a.due_date) - new Date(b.due_date);
      });

      // Find available machine for each job in group
      for (const job of jobGroup) {
        let scheduledJob = false;

        // Try to find compatible machine
        for (const machine of machines) {
          if (!isCompatible(machine.compatibility, job.substrate)) {
            continue;
          }

          // Get current schedule for this machine
          const currentSchedule = await db.query(`
            SELECT scheduled_end
            FROM jobs
            WHERE machine_id = $1
            AND status != 'Completed'
            AND scheduled_end IS NOT NULL
            ORDER BY scheduled_end DESC
            LIMIT 1
          `, [machine.id]);

          const duration = estimateJobDuration(job.quantity, job.product_type);
          let startTime;

          if (currentSchedule.rows.length > 0) {
            startTime = new Date(currentSchedule.rows[0].scheduled_end);
            // If the scheduled end is in the past, start from today
            const now = new Date();
            if (startTime < now) {
              startTime = new Date();
              startTime.setHours(8, 0, 0, 0); // Start of work day
              // If it's past 8 AM, start from now
              if (startTime < now) {
                startTime = now;
              }
            }
          } else {
            startTime = new Date();
            startTime.setHours(8, 0, 0, 0); // Start of work day
            // If it's past 8 AM, start from now
            const now = new Date();
            if (startTime < now) {
              startTime = now;
            }
          }

          const endTime = new Date(startTime.getTime() + duration * 60 * 60 * 1000);

          // Update job with schedule
          await db.query(`
            UPDATE jobs SET
              machine_id = $1,
              scheduled_start = $2,
              scheduled_end = $3,
              updated_at = CURRENT_TIMESTAMP
            WHERE id = $4
          `, [machine.id, startTime, endTime, job.id]);

          scheduled.push({
            job_id: job.id,
            job_name: job.job_name,
            machine_id: machine.id,
            machine_name: machine.name,
            scheduled_start: startTime,
            scheduled_end: endTime,
          });

          scheduledJob = true;
          break;
        }

        if (!scheduledJob) {
          console.warn(`Could not schedule job ${job.id}: No compatible machine available`);
        }
      }
    }

    return { scheduled: scheduled.length, jobs: scheduled };
  } catch (error) {
    console.error('Error scheduling jobs:', error);
    throw error;
  }
};

module.exports = {
  scheduleJobs,
  estimateJobDuration,
  isCompatible,
};

