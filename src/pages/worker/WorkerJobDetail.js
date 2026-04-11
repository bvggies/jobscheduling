import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { jobsAPI } from '../../services/api';
import JobActivityPanel from '../../components/JobActivityPanel';
import { useAuth } from '../../context/AuthContext';
import { STATUS_COLORS } from '../../utils/constants';
import '../customer/CustomerPages.css';

export default function WorkerJobDetail() {
  const { user } = useAuth();
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
        <Link to="/worker/jobs" className="btn btn-outline" style={{ marginTop: '1rem' }}>
          Back to jobs
        </Link>
      </div>
    );
  }

  const finishing = Array.isArray(job.finishing) ? job.finishing.join(', ') : job.finishing || '—';
  const canUpdateProgress =
    job.assigned_worker_id != null && Number(job.assigned_worker_id) === Number(user?.id);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <div className="customer-page-header">
        <button
          type="button"
          className="btn btn-outline btn-sm"
          onClick={() => navigate(-1)}
          style={{ marginBottom: '0.75rem' }}
        >
          ← Back
        </button>
        <h1>{job.job_name}</h1>
        <p>
          Status:{' '}
          <span style={{ color: STATUS_COLORS[job.status], fontWeight: 600 }}>{job.status}</span>
        </p>
      </div>
      {!canUpdateProgress ? (
        <div className="customer-info-panel" style={{ marginBottom: '1rem' }}>
          <p style={{ margin: 0 }}>
            {job.assigned_worker_id
              ? 'Another team member is the production lead on this job. You can review details, but only the assignee can post customer-visible progress here.'
              : 'This job has no production assignee yet. Ask an admin to assign a floor lead so someone can post status and notes for the customer.'}
          </p>
        </div>
      ) : null}
      <div className="customer-form-panel customer-detail-grid">
        <div className="customer-detail-item">
          <label>Customer</label>
          <span>{job.customer_name}</span>
        </div>
        <div className="customer-detail-item">
          <label>Product</label>
          <span>{job.product_type}</span>
        </div>
        <div className="customer-detail-item">
          <label>Quantity</label>
          <span>{job.quantity}</span>
        </div>
        <div className="customer-detail-item">
          <label>Substrate</label>
          <span>{job.substrate}</span>
        </div>
        <div className="customer-detail-item">
          <label>Due date</label>
          <span>{job.due_date ? format(new Date(job.due_date), 'MMM d, yyyy') : '—'}</span>
        </div>
        <div className="customer-detail-item">
          <label>Priority</label>
          <span>{job.priority}</span>
        </div>
        <div className="customer-detail-item">
          <label>Deposit</label>
          <span>{job.deposit_status}</span>
        </div>
        <div className="customer-detail-item">
          <label>Payment</label>
          <span>{job.payment_status}</span>
        </div>
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
        <JobActivityPanel jobId={id} canComment={canUpdateProgress} pollMs={20000} />
      </div>
    </motion.div>
  );
}
