import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { jobsAPI } from '../../services/api';
import JobActivityPanel from '../../components/JobActivityPanel';
import CustomerDepositInfo from '../../components/CustomerDepositInfo';
import { STATUS_COLORS } from '../../utils/constants';
import './CustomerPages.css';

export default function CustomerJobDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await jobsAPI.getById(id);
      setJob(data);
    } catch {
      setJob(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="customer-info-panel">
        <p>Job not found or you do not have access.</p>
        <Link to="/portal/jobs" className="btn btn-outline" style={{ marginTop: '1rem' }}>
          Back to jobs
        </Link>
      </div>
    );
  }

  const finishing = Array.isArray(job.finishing) ? job.finishing.join(', ') : job.finishing || '—';

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <div className="customer-page-header">
        <button type="button" className="btn btn-outline btn-sm" onClick={() => navigate(-1)} style={{ marginBottom: '0.75rem' }}>
          ← Back
        </button>
        <h1>{job.job_name}</h1>
        <p>
          Status:{' '}
          <span style={{ color: STATUS_COLORS[job.status], fontWeight: 600 }}>{job.status}</span>
        </p>
      </div>
      {job.assigned_worker_name ? (
        <div
          className="customer-form-panel"
          style={{ borderLeft: '4px solid #3b82f6', marginBottom: '1rem' }}
        >
          <strong>Your production contact:</strong> {job.assigned_worker_name}
          <p className="form-hint" style={{ marginBottom: 0, marginTop: '0.5rem' }}>
            They post status changes in the timeline below. Use the Message the shop section to reach admins and
            your production lead in the same thread.
          </p>
        </div>
      ) : null}
      <CustomerDepositInfo job={job} onUpdate={load} />
      <div className="customer-form-panel customer-detail-grid">
        <div className="customer-detail-item">
          <label>Service</label>
          <span>{job.product_type}</span>
        </div>
        <div className="customer-detail-item">
          <label>Size / option</label>
          <span>{job.substrate}</span>
        </div>
        <div className="customer-detail-item">
          <label>Quantity</label>
          <span>{job.quantity}</span>
        </div>
        {job.unit_price != null && parseFloat(job.unit_price) > 0 ? (
          <div className="customer-detail-item">
            <label>Unit price</label>
            <span>₵{parseFloat(job.unit_price).toFixed(2)}</span>
          </div>
        ) : null}
        {job.total_cost != null && parseFloat(job.total_cost) > 0 ? (
          <div className="customer-detail-item">
            <label>Total</label>
            <span>₵{parseFloat(job.total_cost).toFixed(2)}</span>
          </div>
        ) : null}
        <div className="customer-detail-item">
          <label>Appointment</label>
          <span>
            {job.due_date ? format(new Date(job.due_date), 'MMM d, yyyy') : '—'}
            {job.due_time ? ` at ${String(job.due_time).slice(0, 5)}` : ''}
          </span>
        </div>
        <div className="customer-detail-item">
          <label>Status</label>
          <span style={{ color: STATUS_COLORS[job.status], fontWeight: 600 }}>{job.status}</span>
        </div>
        {job.po_number ? (
          <div className="customer-detail-item">
            <label>PO number</label>
            <span>{job.po_number}</span>
          </div>
        ) : null}
        {job.machine_name ? (
          <div className="customer-detail-item">
            <label>Machine</label>
            <span>
              {job.machine_name} ({job.machine_type})
            </span>
          </div>
        ) : null}
      </div>
      <div className="customer-form-panel">
        <label className="form-label">Finishing</label>
        <p>{finishing}</p>
      </div>

      <div className="customer-form-panel">
        <JobActivityPanel
          jobId={id}
          canComment
          pollMs={20000}
          introTitle="Message the shop"
          introText="Write below to reach admins and your assigned production lead (when one is set). They see your note here and get a notification so they can respond in this same thread."
          composeLabel="Your message"
          submitButtonLabel="Send message"
        />
      </div>
    </motion.div>
  );
}
