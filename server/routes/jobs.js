const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { createAlert } = require('../utils/alerts');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { insertJobUpdate, logJobFieldChanges } = require('../utils/jobUpdates');

async function loadJobRow(jobId) {
  const result = await db.query(`SELECT * FROM jobs WHERE id = $1`, [jobId]);
  return result.rows[0] || null;
}

async function assertJobAccess(req, jobId) {
  const job = await loadJobRow(jobId);
  if (!job) {
    return { error: { status: 404, body: { error: 'Job not found' } } };
  }
  if (req.user.role === 'customer' && job.user_id !== req.user.id) {
    return { error: { status: 403, body: { error: 'Access denied' } } };
  }
  return { job };
}

async function validateCustomerId(userId) {
  if (userId === null || userId === undefined || userId === '') return { ok: true, value: null };
  const id = parseInt(userId, 10);
  if (Number.isNaN(id)) return { ok: false };
  const r = await db.query(`SELECT id FROM users WHERE id = $1 AND role = 'customer'`, [id]);
  if (!r.rows.length) return { ok: false };
  return { ok: true, value: id };
}

router.get('/', requireAuth, async (req, res) => {
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

    if (req.user.role === 'customer') {
      query += ` AND j.user_id = $${paramCount++}`;
      params.push(req.user.id);
    }

    if (status) {
      query += ` AND j.status = $${paramCount++}`;
      params.push(status);
    }
    if (customer && req.user.role === 'admin') {
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

router.get('/:id/updates', requireAuth, async (req, res) => {
  try {
    const gate = await assertJobAccess(req, req.params.id);
    if (gate.error) return res.status(gate.error.status).json(gate.error.body);

    const result = await db.query(
      `SELECT id, job_id, actor_id, actor_role, actor_name, kind, summary, body, created_at
       FROM job_updates WHERE job_id = $1 ORDER BY created_at ASC`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Job updates list error:', error);
    res.status(500).json({ error: 'Failed to load job updates' });
  }
});

router.post('/:id/comments', requireAuth, async (req, res) => {
  try {
    const gate = await assertJobAccess(req, req.params.id);
    if (gate.error) return res.status(gate.error.status).json(gate.error.body);

    const { message } = req.body;
    if (!message || !String(message).trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }
    const text = String(message).trim();
    const actorName = req.user.name || req.user.email;
    await insertJobUpdate({
      jobId: parseInt(req.params.id, 10),
      actorId: req.user.id,
      actorRole: req.user.role,
      actorName,
      kind: 'comment',
      summary: `${req.user.role === 'admin' ? 'Shop' : 'Customer'} update`,
      body: text,
    });

    if (req.user.role === 'customer') {
      await createAlert(
        'customer_job_update',
        `${actorName} posted an update on job "${gate.job.job_name}"`,
        gate.job.id,
        null,
        'info'
      );
    }

    res.status(201).json({ ok: true });
  } catch (error) {
    console.error('Job comment error:', error);
    res.status(500).json({ error: 'Failed to post update' });
  }
});

router.get('/:id', requireAuth, async (req, res) => {
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
    const job = result.rows[0];
    if (req.user.role === 'customer' && job.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    res.json(job);
  } catch (error) {
    console.error('Error fetching job:', error);
    res.status(500).json({ error: 'Failed to fetch job' });
  }
});

router.post('/', requireAuth, async (req, res) => {
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
      user_id: bodyUserId,
    } = req.body;

    const resolvedCustomerName =
      req.user.role === 'customer' ? req.user.name : customer_name;

    if (!job_name || !resolvedCustomerName || !product_type || !quantity || !substrate || !due_date || !priority) {
      return res.status(400).json({
        error: 'Missing required fields',
        details:
          'Please fill in all required fields: Job Name, Customer Name, Product Type, Quantity, Substrate, Due Date, and Priority',
      });
    }

    let userId = req.user.role === 'customer' ? req.user.id : null;
    if (req.user.role === 'admin' && Object.prototype.hasOwnProperty.call(req.body, 'user_id')) {
      const v = await validateCustomerId(bodyUserId);
      if (!v.ok) {
        return res.status(400).json({ error: 'Invalid portal customer selected' });
      }
      userId = v.value;
    }

    const result = await db.query(
      `INSERT INTO jobs (
        job_name, po_number, customer_name, product_type, quantity,
        substrate, finishing, due_date, due_time, priority, total_cost, deposit_required, user_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        job_name,
        po_number || null,
        resolvedCustomerName,
        product_type,
        parseInt(quantity, 10),
        substrate,
        finishing || [],
        due_date,
        due_time || null,
        priority,
        parseFloat(total_cost) || 0,
        parseFloat(deposit_required) || 0,
        userId,
      ]
    );

    const job = result.rows[0];

    await insertJobUpdate({
      jobId: job.id,
      actorId: req.user.id,
      actorRole: req.user.role,
      actorName: req.user.name || req.user.email,
      kind: 'created',
      summary:
        req.user.role === 'customer'
          ? 'Job submitted from your account.'
          : `Job created by ${req.user.name || 'admin'}.`,
    });

    if (userId) {
      await insertJobUpdate({
        jobId: job.id,
        actorId: req.user.id,
        actorRole: req.user.role,
        actorName: req.user.name || req.user.email,
        kind: 'assignment',
        summary: `Work linked to portal customer #${userId} (they can track progress).`,
      });
    }

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
      }
    }

    res.status(201).json(job);
  } catch (error) {
    console.error('Error creating job:', error);
    const errorMessage = error.message || 'Failed to create job';
    const errorDetails = error.detail || errorMessage;
    res.status(500).json({
      error: 'Failed to create job',
      details: errorDetails,
    });
  }
});

router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const existing = await loadJobRow(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Job not found' });
    }

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
      user_id: bodyUserId,
    } = req.body;

    let nextUserId = existing.user_id;
    if (Object.prototype.hasOwnProperty.call(req.body, 'user_id')) {
      const v = await validateCustomerId(bodyUserId);
      if (!v.ok) {
        return res.status(400).json({ error: 'Invalid portal customer selected' });
      }
      nextUserId = v.value;
    }

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
        user_id = $23,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $24
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
        nextUserId,
        req.params.id,
      ]
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
      console.error('Job update log error:', logErr);
    }

    res.json(updated);
  } catch (error) {
    console.error('Error updating job:', error);
    res.status(500).json({ error: 'Failed to update job' });
  }
});

router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await db.query('DELETE FROM jobs WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }
    res.json({ message: 'Job deleted successfully' });
  } catch (error) {
    console.error('Error deleting job:', error);
    res.status(500).json({ error: 'Failed to delete job' });
  }
});

router.patch('/:id/status', requireAuth, requireAdmin, async (req, res) => {
  try {
    const existing = await loadJobRow(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Job not found' });
    }
    const { status } = req.body;
    const result = await db.query(
      'UPDATE jobs SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [status, req.params.id]
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
      console.error('Status log error:', logErr);
    }

    res.json(updated);
  } catch (error) {
    console.error('Error updating job status:', error);
    res.status(500).json({ error: 'Failed to update job status' });
  }
});

router.post('/:id/duplicate', requireAuth, requireAdmin, async (req, res) => {
  try {
    const originalJob = await db.query(`SELECT * FROM jobs WHERE id = $1`, [req.params.id]);

    if (originalJob.rows.length === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const job = originalJob.rows[0];

    const result = await db.query(
      `INSERT INTO jobs (
        job_name, po_number, customer_name, product_type, quantity,
        substrate, finishing, due_date, due_time, priority, total_cost, deposit_required,
        status, deposit_status, payment_status, user_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
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
        job.due_time || null,
        job.priority,
        job.total_cost,
        job.deposit_required,
        'Not Started',
        'Pending',
        'Pending',
        job.user_id,
      ]
    );

    const created = result.rows[0];
    await insertJobUpdate({
      jobId: created.id,
      actorId: req.user.id,
      actorRole: req.user.role,
      actorName: req.user.name || req.user.email,
      kind: 'created',
      summary: `Duplicated from job #${job.id}.`,
    });

    res.status(201).json(created);
  } catch (error) {
    console.error('Error duplicating job:', error);
    res.status(500).json({ error: 'Failed to duplicate job' });
  }
});

router.patch('/:id/payment', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { type, amount, date } = req.body;
    const job = await db.query('SELECT * FROM jobs WHERE id = $1', [req.params.id]);

    if (job.rows.length === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const existing = job.rows[0];
    let updateQuery;
    let params;

    if (type === 'deposit') {
      const amountValue = parseFloat(amount) || 0;
      const currentDeposit = parseFloat(existing.deposit_received || 0);
      const depositRequired = parseFloat(existing.deposit_required || 0);
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
      const currentFinal = parseFloat(existing.final_payment_received || 0);
      const totalCost = parseFloat(existing.total_cost || 0);
      const depositReceived = parseFloat(existing.deposit_received || 0);
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
      console.error('Payment log error:', logErr);
    }
    res.json(updated);
  } catch (error) {
    console.error('Error updating payment:', error);
    res.status(500).json({ error: 'Failed to update payment' });
  }
});

module.exports = router;
