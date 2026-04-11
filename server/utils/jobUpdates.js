const db = require('../config/database');

async function insertJobUpdate({
  jobId,
  actorId = null,
  actorRole,
  actorName = null,
  kind,
  summary,
  body = null,
}) {
  await db.query(
    `INSERT INTO job_updates (job_id, actor_id, actor_role, actor_name, kind, summary, body)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [jobId, actorId, actorRole, actorName, kind, summary, body]
  );
}

function norm(v) {
  if (v === undefined || v === null) return '';
  return String(v);
}

async function logJobFieldChanges({ oldRow, newRow, actorId, actorRole, actorName }) {
  if (!oldRow || !newRow) return;

  if (norm(oldRow.status) !== norm(newRow.status)) {
    await insertJobUpdate({
      jobId: newRow.id,
      actorId,
      actorRole,
      actorName,
      kind: 'status_change',
      summary: `Status changed: ${oldRow.status} → ${newRow.status}`,
    });
  }

  if (norm(oldRow.user_id) !== norm(newRow.user_id)) {
    const prev = oldRow.user_id ? `customer #${oldRow.user_id}` : 'unassigned';
    const next = newRow.user_id ? `customer #${newRow.user_id}` : 'unassigned';
    await insertJobUpdate({
      jobId: newRow.id,
      actorId,
      actorRole,
      actorName,
      kind: 'assignment',
      summary: `Work assigned on portal: ${prev} → ${next}`,
    });
  }

  if (norm(oldRow.assigned_worker_id) !== norm(newRow.assigned_worker_id)) {
    const ids = [oldRow.assigned_worker_id, newRow.assigned_worker_id]
      .map((x) => (x === undefined || x === null || x === '' ? null : parseInt(x, 10)))
      .filter((n) => n !== null && !Number.isNaN(n));
    const idNums = [...new Set(ids)];
    let prevLabel = 'Unassigned';
    let nextLabel = 'Unassigned';
    if (idNums.length) {
      const r = await db.query(`SELECT id, name FROM users WHERE id = ANY($1::int[])`, [idNums]);
      const map = Object.fromEntries(r.rows.map((row) => [row.id, row.name]));
      if (oldRow.assigned_worker_id != null && oldRow.assigned_worker_id !== '') {
        const oid = parseInt(oldRow.assigned_worker_id, 10);
        prevLabel = map[oid] || `Staff #${oid}`;
      }
      if (newRow.assigned_worker_id != null && newRow.assigned_worker_id !== '') {
        const nid = parseInt(newRow.assigned_worker_id, 10);
        nextLabel = map[nid] || `Staff #${nid}`;
      }
    }
    await insertJobUpdate({
      jobId: newRow.id,
      actorId,
      actorRole,
      actorName,
      kind: 'worker_assignment',
      summary: `Production lead: ${prevLabel} → ${nextLabel}`,
    });
  }

  const schedOld = `${norm(oldRow.machine_id)}|${norm(oldRow.scheduled_start)}|${norm(oldRow.scheduled_end)}`;
  const schedNew = `${norm(newRow.machine_id)}|${norm(newRow.scheduled_start)}|${norm(newRow.scheduled_end)}`;
  if (schedOld !== schedNew) {
    await insertJobUpdate({
      jobId: newRow.id,
      actorId,
      actorRole,
      actorName,
      kind: 'schedule',
      summary: 'Machine or schedule window was updated.',
    });
  }

  if (
    norm(oldRow.deposit_status) !== norm(newRow.deposit_status) ||
    norm(oldRow.payment_status) !== norm(newRow.payment_status) ||
    norm(oldRow.deposit_received) !== norm(newRow.deposit_received) ||
    norm(oldRow.final_payment_received) !== norm(newRow.final_payment_received)
  ) {
    await insertJobUpdate({
      jobId: newRow.id,
      actorId,
      actorRole,
      actorName,
      kind: 'payment',
      summary: `Payments updated (deposit: ${newRow.deposit_status}, balance: ${newRow.payment_status}).`,
    });
  }

  const specOld = [
    oldRow.job_name,
    oldRow.customer_name,
    oldRow.product_type,
    oldRow.quantity,
    oldRow.substrate,
    oldRow.priority,
    oldRow.due_date,
    JSON.stringify(oldRow.finishing || []),
  ].join('|');
  const specNew = [
    newRow.job_name,
    newRow.customer_name,
    newRow.product_type,
    newRow.quantity,
    newRow.substrate,
    newRow.priority,
    newRow.due_date,
    JSON.stringify(newRow.finishing || []),
  ].join('|');
  if (specOld !== specNew) {
    await insertJobUpdate({
      jobId: newRow.id,
      actorId,
      actorRole,
      actorName,
      kind: 'details',
      summary: 'Job specification was edited (product, materials, dates, or finishing).',
    });
  }
}

module.exports = {
  insertJobUpdate,
  logJobFieldChanges,
};
