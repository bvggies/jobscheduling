import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { jobsAPI } from '../../services/api';
import { STATUS_COLORS } from '../../utils/constants';
import './CustomerPages.css';

export default function CustomerJobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await jobsAPI.getAll();
      setJobs(data || []);
    } catch {
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <div className="customer-page-header">
        <h1>My jobs</h1>
        <p>Jobs linked to your account.</p>
      </div>
      {loading ? (
        <div className="loading">
          <div className="spinner" />
        </div>
      ) : jobs.length === 0 ? (
        <div className="customer-info-panel">
          <p>No jobs yet.</p>
          <Link to="/portal/jobs/new" className="btn btn-primary" style={{ marginTop: '1rem' }}>
            Submit a job
          </Link>
        </div>
      ) : (
        <div className="customer-table-wrap">
          <table className="customer-table">
            <thead>
              <tr>
                <th>Job</th>
                <th>Due</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.id}>
                  <td>{job.job_name}</td>
                  <td>{job.due_date ? format(new Date(job.due_date), 'MMM d, yyyy') : '—'}</td>
                  <td>
                    <span
                      style={{
                        color: STATUS_COLORS[job.status] || '#6b7280',
                        fontWeight: 600,
                        fontSize: '0.85rem',
                      }}
                    >
                      {job.status}
                    </span>
                  </td>
                  <td>
                    <Link to={`/portal/jobs/${job.id}`}>View</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </motion.div>
  );
}
