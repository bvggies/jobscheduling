import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { jobsAPI, feedbackAPI, activityAPI } from '../../services/api';
import { FiBriefcase, FiMessageSquare, FiPlus } from 'react-icons/fi';
import './CustomerPages.css';

export default function CustomerDashboard() {
  const [jobCount, setJobCount] = useState(null);
  const [openFeedback, setOpenFeedback] = useState(null);
  const [recentWork, setRecentWork] = useState([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [jobsRes, fbRes, actRes] = await Promise.all([
          jobsAPI.getAll(),
          feedbackAPI.getAll(),
          activityAPI.getMine({ limit: 12 }),
        ]);
        if (cancelled) return;
        setJobCount(jobsRes.data?.length ?? 0);
        const open = (fbRes.data || []).filter((f) => f.status !== 'closed').length;
        setOpenFeedback(open);
        setRecentWork(actRes.data || []);
      } catch {
        if (!cancelled) {
          setJobCount(0);
          setOpenFeedback(0);
          setRecentWork([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <div className="customer-page-header">
        <h1>Your dashboard</h1>
        <p>Track jobs you have submitted and send feedback to the shop.</p>
      </div>
      <div className="customer-tiles">
        <Link to="/portal/jobs" className="customer-tile">
          <FiBriefcase className="customer-tile-icon" />
          <div>
            <h2>My jobs</h2>
            <p>{jobCount === null ? '…' : `${jobCount} job${jobCount === 1 ? '' : 's'}`}</p>
          </div>
        </Link>
        <Link to="/portal/jobs/new" className="customer-tile">
          <FiPlus className="customer-tile-icon" />
          <div>
            <h2>New job</h2>
            <p>Request a new print job</p>
          </div>
        </Link>
        <Link to="/portal/feedback" className="customer-tile">
          <FiMessageSquare className="customer-tile-icon" />
          <div>
            <h2>Feedback</h2>
            <p>
              {openFeedback === null
                ? 'Messages with the shop'
                : `${openFeedback} open thread${openFeedback === 1 ? '' : 's'}`}
            </p>
          </div>
        </Link>
      </div>
      {recentWork.length > 0 ? (
        <section className="customer-info-panel" style={{ marginBottom: '1.5rem' }}>
          <h2>Recent updates on your work</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '0.75rem', fontSize: '0.95rem' }}>
            Status changes, scheduling, payments, and messages from the shop appear here. Open a job for the full
            timeline.
          </p>
          <ul className="customer-activity-feed">
            {recentWork.map((u) => (
              <li key={u.id}>
                <Link to={`/portal/jobs/${u.job_id}`}>
                  <span className="customer-activity-job">{u.job_name}</span>
                  <span className="customer-activity-text">{u.summary}</span>
                  <span className="customer-activity-time">{format(new Date(u.created_at), 'MMM d, h:mm a')}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="customer-info-panel">
        <h2>How it works</h2>
        <ol className="customer-steps">
          <li>Submit a job with product details and finishing options.</li>
          <li>The shop links your job to your account so you see every production update in real time.</li>
          <li>Open any job for the full timeline; post updates so the shop can track your progress too.</li>
          <li>Use Feedback for general questions; replies appear on that thread.</li>
        </ol>
      </section>
    </motion.div>
  );
}
