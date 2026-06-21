const express = require('express');
const { randomBytes } = require('crypto');
const router = express.Router();
const db = require('../config/database');
const { createAlert } = require('../utils/alerts');
const { requireAuth, requireAdmin, requireAdminOrWorker } = require('../middleware/auth');
const { insertJobUpdate, logJobFieldChanges } = require('../utils/jobUpdates');
const { validateCustomerOrder, validateDepositPayment } = require('../utils/serviceCatalog');
const { getAvailableSlots, isValidBookableSlot, slotKey } = require('../utils/appointmentSlots');

/** PO-YYYYMMDD-XXXXXXXX (8 hex) — collision-checked before insert */
function buildPoCandidate() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const suffix = randomBytes(4).toString('hex').toUpperCase();
  return `PO-${y}${m}${day}-${suffix}`;
}

async function allocateUniquePoNumber() {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const candidate = buildPoCandidate();
    const dup = await db.query(`SELECT 1 FROM jobs WHERE po_number = $1`, [candidate]);
    if (dup.rows.length === 0) return candidate;
  }
  throw new Error('Could not allocate unique PO number');
}

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

async function validateWorkerId(userId) {
  if (userId === null || userId === undefined || userId === '') return { ok: true, value: null };
  const id = parseInt(userId, 10);
  if (Number.isNaN(id)) return { ok: false };
  const r = await db.query(`SELECT id FROM users WHERE id = $1 AND role = 'worker'`, [id]);
  if (!r.rows.length) return { ok: false };
  return { ok: true, value: id };
}

function workerMayUpdateJobProgress(req, job) {
  if (req.user.role !== 'worker') return true;
  if (!job || job.assigned_worker_id == null) return false;
  return Number(job.assigned_worker_id) === Number(req.user.id);
}

router.get('/', requireAuth, async (req, res) => {
  try {
    const { status, customer, machine_id, start_date, end_date, q } = req.query;
    let query = `
      SELECT j.*, m.name as machine_name, m.type as machine_type,
             w.name as assigned_worker_name
      FROM jobs j
      LEFT JOIN machines m ON j.machine_id = m.id
      LEFT JOIN users w ON j.assigned_worker_id = w.id
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
    if (customer && (req.user.role === 'admin' || req.user.role === 'worker')) {
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
    if (q && String(q).trim()) {
      const term = `%${String(q).trim()}%`;
      const qp = paramCount++;
      query += ` AND (
        j.job_name ILIKE $${qp}
        OR j.customer_name ILIKE $${qp}
        OR COALESCE(j.po_number, '') ILIKE $${qp}
        OR j.product_type ILIKE $${qp}
        OR CAST(j.id AS TEXT) ILIKE $${qp}
      )`;
      params.push(term);
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
    if (!workerMayUpdateJobProgress(req, gate.job)) {
      return res.status(403).json({
        error: 'Only the worker assigned to this job can post production updates for the customer.',
      });
    }

    const { message } = req.body;
    if (!message || !String(message).trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }
    const text = String(message).trim();
    const actorName = req.user.name || req.user.email;
    const who =
      req.user.role === 'admin' ? 'Shop' : req.user.role === 'worker' ? 'Floor' : 'Customer';
    const commentSummary =
      req.user.role === 'customer'
        ? 'Customer message to the shop'
        : `${who} update`;
    await insertJobUpdate({
      jobId: parseInt(req.params.id, 10),
      actorId: req.user.id,
      actorRole: req.user.role,
      actorName,
      kind: 'comment',
      summary: commentSummary,
      body: text,
    });

    if (req.user.role === 'customer') {
      await createAlert(
        'customer_job_update',
        `${actorName} sent a message on job "${gate.job.job_name}". Open the job to reply.`,
        gate.job.id,
        null,
        'info',
        null
      );
      if (gate.job.assigned_worker_id) {
        await createAlert(
          'customer_job_update',
          `${actorName} messaged the team about "${gate.job.job_name}" — you are the production lead on this job.`,
          gate.job.id,
          null,
          'info',
          gate.job.assigned_worker_id
        );
      }
    } else if (req.user.role === 'worker') {
      await createAlert(
        'worker_job_update',
        `${actorName} posted an update on job "${gate.job.job_name}"`,
        gate.job.id,
        null,
        'info',
        null
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
      `SELECT j.*, m.name as machine_name, m.type as machine_type,
              w.name as assigned_worker_name
       FROM jobs j
       LEFT JOIN machines m ON j.machine_id = m.id
       LEFT JOIN users w ON j.assigned_worker_id = w.id
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
    if (req.user.role === 'worker') {
      return res.status(403).json({ error: 'Workers cannot create jobs' });
    }

    const isCustomerOrder = req.user.role === 'customer';

    if (isCustomerOrder) {
      const {
        service_id,
        service_variant,
        quantity,
        due_date,
        due_time,
        total_cost,
        deposit_required,
        job_name: customJobName,
        deposit_payment,
      } = req.body;

      if (!service_id || !quantity || !due_date || !due_time) {
        return res.status(400).json({
          error: 'Select a service, quantity, and an available appointment slot',
        });
      }

      if (!isValidBookableSlot(due_date, due_time)) {
        return res.status(400).json({ error: 'Selected appointment slot is not available' });
      }

      const available = await getAvailableSlots(db, { daysAhead: 30 });
      const chosenKey = slotKey(due_date, String(due_time).slice(0, 5));
      if (!available.some((s) => slotKey(s.date, s.time) === chosenKey)) {
        return res.status(409).json({ error: 'That time slot was just booked. Please choose another.' });
      }

      const validation = await validateCustomerOrder(db, {
        service_id,
        service_variant,
        quantity,
        total_cost,
        deposit_required,
      });
      if (!validation.ok) {
        return res.status(400).json({ error: validation.error });
      }

      const paymentCheck = validateDepositPayment(validation.pricing, deposit_payment);
      if (!paymentCheck.ok) {
        return res.status(400).json({ error: paymentCheck.error });
      }

      const { pricing, service } = validation;
      const poNumber = await allocateUniquePoNumber();
      const resolvedCustomerName = req.user.name;
      const variantLabel = pricing.variantLabel || service.name;
      const autoJobName =
        customJobName?.trim() ||
        `${service.name}${variantLabel && variantLabel !== service.name ? ` — ${variantLabel}` : ''}`;

      const result = await db.query(
        `INSERT INTO jobs (
          job_name, po_number, customer_name, product_type, quantity,
          substrate, finishing, due_date, due_time, priority, total_cost, deposit_required,
          user_id, service_id, service_variant, unit_price,
          deposit_momo_phone, deposit_momo_reference, deposit_submitted_amount, deposit_submitted_at,
          deposit_verification_status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
        RETURNING *`,
        [
          autoJobName,
          poNumber,
          resolvedCustomerName,
          service.name,
          parseInt(quantity, 10),
          variantLabel,
          [],
          due_date,
          String(due_time).slice(0, 5),
          'Medium',
          pricing.quoteRequired ? 0 : pricing.total,
          pricing.quoteRequired ? 0 : pricing.depositRequired,
          req.user.id,
          service_id,
          service_variant || null,
          pricing.unitPrice,
          pricing.quoteRequired ? null : String(deposit_payment.momo_phone).trim(),
          pricing.quoteRequired ? null : String(deposit_payment.momo_reference).trim(),
          pricing.quoteRequired ? null : paymentCheck.amount,
          pricing.quoteRequired ? null : new Date(),
          pricing.quoteRequired ? 'none' : 'pending',
        ]
      );

      const job = result.rows[0];

      await insertJobUpdate({
        jobId: job.id,
        actorId: req.user.id,
        actorRole: req.user.role,
        actorName: req.user.name || req.user.email,
        kind: 'created',
        summary: pricing.quoteRequired
          ? 'Quote request submitted — the shop will confirm pricing before you pay a deposit.'
          : `Order submitted with MoMo deposit ₵${paymentCheck.amount} (ref: ${deposit_payment.momo_reference}). Awaiting shop confirmation before work starts.`,
      });

      return res.status(201).json(job);
    }

    const {
      job_name,
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
      assigned_worker_id: bodyAssignedWorkerId,
    } = req.body;

    const poNumber = await allocateUniquePoNumber();

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

    let assignedWorkerId = null;
    if (req.user.role === 'admin' && Object.prototype.hasOwnProperty.call(req.body, 'assigned_worker_id')) {
      const wv = await validateWorkerId(bodyAssignedWorkerId);
      if (!wv.ok) {
        return res.status(400).json({ error: 'Invalid worker selected' });
      }
      assignedWorkerId = wv.value;
    }

    const result = await db.query(
      `INSERT INTO jobs (
        job_name, po_number, customer_name, product_type, quantity,
        substrate, finishing, due_date, due_time, priority, total_cost, deposit_required, user_id, assigned_worker_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *`,
      [
        job_name,
        poNumber,
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
        assignedWorkerId,
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

    if (assignedWorkerId) {
      const wn = await db.query(`SELECT name FROM users WHERE id = $1`, [assignedWorkerId]);
      const wname = wn.rows[0]?.name || 'Staff';
      await insertJobUpdate({
        jobId: job.id,
        actorId: req.user.id,
        actorRole: req.user.role,
        actorName: req.user.name || req.user.email,
        kind: 'worker_assignment',
        summary: `${wname} is leading production on this job (visible to the customer).`,
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
      assigned_worker_id: bodyAssignedWorkerId,
    } = req.body;

    let nextUserId = existing.user_id;
    if (Object.prototype.hasOwnProperty.call(req.body, 'user_id')) {
      const v = await validateCustomerId(bodyUserId);
      if (!v.ok) {
        return res.status(400).json({ error: 'Invalid portal customer selected' });
      }
      nextUserId = v.value;
    }

    let nextAssignedWorkerId = existing.assigned_worker_id;
    if (Object.prototype.hasOwnProperty.call(req.body, 'assigned_worker_id')) {
      const wv = await validateWorkerId(bodyAssignedWorkerId);
      if (!wv.ok) {
        return res.status(400).json({ error: 'Invalid worker selected' });
      }
      nextAssignedWorkerId = wv.value;
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
        assigned_worker_id = $23,
        user_id = $24,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $25
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
        nextAssignedWorkerId,
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

router.patch('/:id/status', requireAuth, requireAdminOrWorker, async (req, res) => {
  try {
    const existing = await loadJobRow(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Job not found' });
    }
    if (!workerMayUpdateJobProgress(req, existing)) {
      return res.status(403).json({
        error: 'Only the worker assigned to this job can change status for the customer timeline.',
      });
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
    const duplicatePo = await allocateUniquePoNumber();

    const result = await db.query(
      `INSERT INTO jobs (
        job_name, po_number, customer_name, product_type, quantity,
        substrate, finishing, due_date, due_time, priority, total_cost, deposit_required,
        status, deposit_status, payment_status, user_id, assigned_worker_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *`,
      [
        `${job.job_name} (Copy)`,
        duplicatePo,
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
        null,
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

router.patch('/:id/submit-deposit', requireAuth, async (req, res) => {
  try {
    const access = await assertJobAccess(req, req.params.id);
    if (access.error) return res.status(access.error.status).json(access.error.body);
    const job = access.job;

    if (req.user.role !== 'customer') {
      return res.status(403).json({ error: 'Only customers can submit MoMo deposit payments here' });
    }
    if (parseFloat(job.total_cost) <= 0 || parseFloat(job.deposit_required) <= 0) {
      return res.status(400).json({ error: 'Wait for the shop to confirm your quote before paying a deposit' });
    }
    if (job.deposit_status === 'Received') {
      return res.status(400).json({ error: 'Deposit already confirmed' });
    }
    if (job.deposit_verification_status === 'pending') {
      return res.status(400).json({ error: 'Your deposit is already pending verification' });
    }

    const pricing = {
      quoteRequired: false,
      depositRequired: parseFloat(job.deposit_required),
    };
    const paymentCheck = validateDepositPayment(pricing, req.body.deposit_payment || req.body);
    if (!paymentCheck.ok) return res.status(400).json({ error: paymentCheck.error });

    const payment = req.body.deposit_payment || req.body;
    const result = await db.query(
      `UPDATE jobs SET
        deposit_momo_phone = $1,
        deposit_momo_reference = $2,
        deposit_submitted_amount = $3,
        deposit_submitted_at = CURRENT_TIMESTAMP,
        deposit_verification_status = 'pending',
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [
        String(payment.momo_phone).trim(),
        String(payment.momo_reference).trim(),
        paymentCheck.amount,
        req.params.id,
      ]
    );

    await insertJobUpdate({
      jobId: job.id,
      actorId: req.user.id,
      actorRole: req.user.role,
      actorName: req.user.name || req.user.email,
      kind: 'payment',
      summary: `MoMo deposit submitted: ₵${paymentCheck.amount} (ref: ${payment.momo_reference}). Awaiting shop confirmation.`,
    });

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Submit deposit error:', error);
    res.status(500).json({ error: 'Failed to submit deposit payment' });
  }
});

router.patch('/:id/verify-deposit', requireAuth, requireAdmin, async (req, res) => {
  try {
    const existing = await loadJobRow(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Job not found' });

    const { action } = req.body;
    if (!['confirm', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'action must be confirm or reject' });
    }
    if (existing.deposit_verification_status !== 'pending') {
      return res.status(400).json({ error: 'No pending MoMo deposit to verify' });
    }

    let result;
    if (action === 'confirm') {
      const amount = parseFloat(existing.deposit_submitted_amount || 0);
      const required = parseFloat(existing.deposit_required || 0);
      if (amount < required - 0.01) {
        return res.status(400).json({ error: 'Submitted amount is below required deposit' });
      }
      result = await db.query(
        `UPDATE jobs SET
          deposit_received = $1,
          deposit_date = CURRENT_DATE,
          deposit_status = 'Received',
          deposit_verification_status = 'confirmed',
          updated_at = CURRENT_TIMESTAMP
         WHERE id = $2
         RETURNING *`,
        [amount, req.params.id]
      );
    } else {
      result = await db.query(
        `UPDATE jobs SET
          deposit_verification_status = 'rejected',
          updated_at = CURRENT_TIMESTAMP
         WHERE id = $1
         RETURNING *`,
        [req.params.id]
      );
    }

    const updated = result.rows[0];
    await insertJobUpdate({
      jobId: updated.id,
      actorId: req.user.id,
      actorRole: req.user.role,
      actorName: req.user.name || req.user.email,
      kind: 'payment',
      summary:
        action === 'confirm'
          ? `Deposit confirmed (₵${updated.deposit_received}). Work can proceed once marked Ready.`
          : 'Submitted MoMo deposit was rejected — customer must pay again with a valid reference.',
    });

    try {
      await logJobFieldChanges({
        oldRow: existing,
        newRow: updated,
        actorId: req.user.id,
        actorRole: req.user.role,
        actorName: req.user.name || req.user.email,
      });
    } catch (logErr) {
      console.error('Verify deposit log error:', logErr);
    }

    res.json(updated);
  } catch (error) {
    console.error('Verify deposit error:', error);
    res.status(500).json({ error: 'Failed to verify deposit' });
  }
});

router.patch('/:id/quote', requireAuth, requireAdmin, async (req, res) => {
  try {
    const existing = await loadJobRow(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Job not found' });

    const totalCost = parseFloat(req.body.total_cost);
    if (!Number.isFinite(totalCost) || totalCost <= 0) {
      return res.status(400).json({ error: 'Enter a valid total cost for this quote' });
    }
    const { calcDepositRequired } = require('../utils/shopConfig');
    const depositRequired =
      req.body.deposit_required != null
        ? parseFloat(req.body.deposit_required)
        : calcDepositRequired(totalCost);
    if (depositRequired < calcDepositRequired(totalCost) - 0.01) {
      return res.status(400).json({ error: 'Deposit must be at least 80% of total cost' });
    }

    const result = await db.query(
      `UPDATE jobs SET
        total_cost = $1,
        deposit_required = $2,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [totalCost, depositRequired, req.params.id]
    );

    const updated = result.rows[0];
    await insertJobUpdate({
      jobId: updated.id,
      actorId: req.user.id,
      actorRole: req.user.role,
      actorName: req.user.name || req.user.email,
      kind: 'quote',
      summary: `Quote confirmed: total ₵${totalCost.toFixed(2)}, deposit ₵${depositRequired.toFixed(2)} (80%). Customer can now pay via MoMo.`,
    });

    res.json(updated);
  } catch (error) {
    console.error('Set quote error:', error);
    res.status(500).json({ error: 'Failed to set quote pricing' });
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
          deposit_verification_status = CASE WHEN $3 = 'Received' THEN 'confirmed' ELSE deposit_verification_status END,
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
