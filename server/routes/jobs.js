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
      priority,
      total_cost,
      deposit_required,
    } = req.body;

    const result = await db.query(
      `INSERT INTO jobs (
        job_name, po_number, customer_name, product_type, quantity,
        substrate, finishing, due_date, priority, total_cost, deposit_required
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        job_name,
        po_number,
        customer_name,
        product_type,
        quantity,
        substrate,
        finishing || [],
        due_date,
        priority,
        total_cost || 0,
        deposit_required || 0,
      ]
    );

    const job = result.rows[0];

    // Create alert for rush jobs
    if (priority === 'Rush') {
      await createAlert(
        'rush_job',
        `Rush job "${job_name}" has been added with due date ${due_date}`,
        job.id,
        null,
        'warning'
      );
    }

    res.status(201).json(job);
  } catch (error) {
    console.error('Error creating job:', error);
    res.status(500).json({ error: 'Failed to create job' });
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
        priority = COALESCE($9, priority),
        status = COALESCE($10, status),
        machine_id = COALESCE($11, machine_id),
        scheduled_start = COALESCE($12, scheduled_start),
        scheduled_end = COALESCE($13, scheduled_end),
        total_cost = COALESCE($14, total_cost),
        deposit_required = COALESCE($15, deposit_required),
        deposit_received = COALESCE($16, deposit_received),
        deposit_date = COALESCE($17, deposit_date),
        deposit_status = COALESCE($18, deposit_status),
        final_payment_received = COALESCE($19, final_payment_received),
        final_payment_date = COALESCE($20, final_payment_date),
        payment_status = COALESCE($21, payment_status),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $22
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
      const depositReceived = (currentJob.deposit_received || 0) + parseFloat(amount);
      const depositStatus = depositReceived >= (currentJob.deposit_required || 0) ? 'Received' : 'Pending';
      
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
      const finalReceived = (currentJob.final_payment_received || 0) + parseFloat(amount);
      const balanceDue = (currentJob.total_cost || 0) - (currentJob.deposit_received || 0);
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

