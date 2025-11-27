const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { createAlert } = require('../utils/alerts');

// Get all jobs
router.get('/', async (req, res) => {
  try {
    const { status, customer, machine_id, start_date, end_date } = req.query;
    let query = `
      SELECT j.*, m.name as machine_name, m.type as machine_type
      FROM jobs j
      LEFT JOIN machines m ON j.machine_id = m.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (status) {
      query += ` AND j.status = $${paramCount++}`;
      params.push(status);
    }
    if (customer) {
      query += ` AND j.customer_name ILIKE $${paramCount++}`;
      params.push(`%${customer}%`);
    }
    if (machine_id) {
      query += ` AND j.machine_id = $${paramCount++}`;
      params.push(machine_id);
    }
    if (start_date) {
      query += ` AND j.due_date >= $${paramCount++}`;
      params.push(start_date);
    }
    if (end_date) {
      query += ` AND j.due_date <= $${paramCount++}`;
      params.push(end_date);
    }

    query += ` ORDER BY j.due_date ASC, j.priority DESC`;

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching jobs:', error);
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

// Get single job
router.get('/:id', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT j.*, m.name as machine_name, m.type as machine_type
       FROM jobs j
       LEFT JOIN machines m ON j.machine_id = m.id
       WHERE j.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching job:', error);
    res.status(500).json({ error: 'Failed to fetch job' });
  }
});

// Create new job
router.post('/', async (req, res) => {
  try {
    const {
      job_name,
      po_number,
      customer_name,
      product_type,
      quantity,
      substrate,
      finishing,
      due_date,
      due_time,
      priority,
      total_cost,
      deposit_required,
    } = req.body;

    // Validate required fields
    if (!job_name || !customer_name || !product_type || !quantity || !substrate || !due_date || !priority) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        details: 'Please fill in all required fields: Job Name, Customer Name, Product Type, Quantity, Substrate, Due Date, and Priority'
      });
    }

    const result = await db.query(
      `INSERT INTO jobs (
        job_name, po_number, customer_name, product_type, quantity,
        substrate, finishing, due_date, due_time, priority, total_cost, deposit_required
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        job_name,
        po_number || null,
        customer_name,
        product_type,
        parseInt(quantity),
        substrate,
        finishing || [],
        due_date,
        due_time || null,
        priority,
        parseFloat(total_cost) || 0,
        parseFloat(deposit_required) || 0,
      ]
    );

    const job = result.rows[0];

    // Create alert for rush jobs
    if (priority === 'Rush') {
      try {
        await createAlert(
          'rush_job',
          `Rush job "${job_name}" has been added with due date ${due_date}`,
          job.id,
          null,
          'warning'
        );
      } catch (alertError) {
        console.error('Error creating alert:', alertError);
        // Don't fail the job creation if alert fails
      }
    }

    res.status(201).json(job);
  } catch (error) {
    console.error('Error creating job:', error);
    const errorMessage = error.message || 'Failed to create job';
    const errorDetails = error.detail || errorMessage;
    res.status(500).json({ 
      error: 'Failed to create job',
      details: errorDetails
    });
  }
});

// Update job
router.put('/:id', async (req, res) => {
  try {
    const {
      job_name,
      po_number,
      customer_name,
      product_type,
      quantity,
      substrate,
      finishing,
      due_date,
      due_time,
      priority,
      status,
      machine_id,
      scheduled_start,
      scheduled_end,
      total_cost,
      deposit_required,
      deposit_received,
      deposit_date,
      deposit_status,
      final_payment_received,
      final_payment_date,
      payment_status,
    } = req.body;

    const result = await db.query(
      `UPDATE jobs SET
        job_name = COALESCE($1, job_name),
        po_number = COALESCE($2, po_number),
        customer_name = COALESCE($3, customer_name),
        product_type = COALESCE($4, product_type),
        quantity = COALESCE($5, quantity),
        substrate = COALESCE($6, substrate),
        finishing = COALESCE($7, finishing),
        due_date = COALESCE($8, due_date),
        due_time = COALESCE($9, due_time),
        priority = COALESCE($10, priority),
        status = COALESCE($11, status),
        machine_id = COALESCE($12, machine_id),
        scheduled_start = COALESCE($13, scheduled_start),
        scheduled_end = COALESCE($14, scheduled_end),
        total_cost = COALESCE($15, total_cost),
        deposit_required = COALESCE($16, deposit_required),
        deposit_received = COALESCE($17, deposit_received),
        deposit_date = COALESCE($18, deposit_date),
        deposit_status = COALESCE($19, deposit_status),
        final_payment_received = COALESCE($20, final_payment_received),
        final_payment_date = COALESCE($21, final_payment_date),
        payment_status = COALESCE($22, payment_status),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $23
      RETURNING *`,
      [
        job_name,
        po_number,
        customer_name,
        product_type,
        quantity,
        substrate,
        finishing,
        due_date,
        due_time,
        priority,
        status,
        machine_id,
        scheduled_start,
        scheduled_end,
        total_cost,
        deposit_required,
        deposit_received,
        deposit_date,
        deposit_status,
        final_payment_received,
        final_payment_date,
        payment_status,
        req.params.id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating job:', error);
    res.status(500).json({ error: 'Failed to update job' });
  }
});

// Delete job
router.delete('/:id', async (req, res) => {
  try {
    const result = await db.query('DELETE FROM jobs WHERE id = $1 RETURNING *', [
      req.params.id,
    ]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }
    res.json({ message: 'Job deleted successfully' });
  } catch (error) {
    console.error('Error deleting job:', error);
    res.status(500).json({ error: 'Failed to delete job' });
  }
});

// Update job status
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const result = await db.query(
      'UPDATE jobs SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [status, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating job status:', error);
    res.status(500).json({ error: 'Failed to update job status' });
  }
});

// Duplicate job
router.post('/:id/duplicate', async (req, res) => {
  try {
    // Get the original job
    const originalJob = await db.query(
      `SELECT * FROM jobs WHERE id = $1`,
      [req.params.id]
    );

    if (originalJob.rows.length === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const job = originalJob.rows[0];

    // Create a new job with the same data but reset status and payment info
    const result = await db.query(
      `INSERT INTO jobs (
        job_name, po_number, customer_name, product_type, quantity,
        substrate, finishing, due_date, priority, total_cost, deposit_required,
        status, deposit_status, payment_status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *`,
      [
        `${job.job_name} (Copy)`,
        job.po_number,
        job.customer_name,
        job.product_type,
        job.quantity,
        job.substrate,
        job.finishing,
        job.due_date,
        job.priority,
        job.total_cost,
        job.deposit_required,
        'Not Started',
        'Pending',
        'Pending',
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error duplicating job:', error);
    res.status(500).json({ error: 'Failed to duplicate job' });
  }
});

// Update payment
router.patch('/:id/payment', async (req, res) => {
  try {
    const { type, amount, date } = req.body; // type: 'deposit' or 'final'
    const job = await db.query('SELECT * FROM jobs WHERE id = $1', [req.params.id]);

    if (job.rows.length === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const currentJob = job.rows[0];
    let updateQuery;
    let params;

    if (type === 'deposit') {
      const amountValue = parseFloat(amount) || 0;
      const currentDeposit = parseFloat(currentJob.deposit_received || 0);
      const depositRequired = parseFloat(currentJob.deposit_required || 0);
      const depositReceived = currentDeposit + amountValue;
      const depositStatus = depositReceived >= depositRequired ? 'Received' : 'Pending';
      
      updateQuery = `
        UPDATE jobs SET
          deposit_received = $1,
          deposit_date = $2,
          deposit_status = $3,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $4
        RETURNING *
      `;
      params = [depositReceived, date, depositStatus, req.params.id];
    } else if (type === 'final') {
      const amountValue = parseFloat(amount) || 0;
      const currentFinal = parseFloat(currentJob.final_payment_received || 0);
      const totalCost = parseFloat(currentJob.total_cost || 0);
      const depositReceived = parseFloat(currentJob.deposit_received || 0);
      const finalReceived = currentFinal + amountValue;
      const balanceDue = totalCost - depositReceived;
      const paymentStatus = finalReceived >= balanceDue ? 'Paid' : 'Pending';
      
      updateQuery = `
        UPDATE jobs SET
          final_payment_received = $1,
          final_payment_date = $2,
          payment_status = $3,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $4
        RETURNING *
      `;
      params = [finalReceived, date, paymentStatus, req.params.id];
    } else {
      return res.status(400).json({ error: 'Invalid payment type' });
    }

    const result = await db.query(updateQuery, params);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating payment:', error);
    res.status(500).json({ error: 'Failed to update payment' });
  }
});

module.exports = router;

