import React, { useCallback, useEffect, useState } from 'react';
import { format } from 'date-fns';
import { jobsAPI } from '../services/api';
import { FiMessageCircle, FiRefreshCw } from 'react-icons/fi';
import './JobActivityPanel.css';

const kindLabel = {
  created: 'Created',
  assignment: 'Assignment',
  status_change: 'Status',
  schedule: 'Schedule',
  payment: 'Payment',
  details: 'Details',
  comment: 'Message',
};

export default function JobActivityPanel({ jobId, canComment, pollMs = 0 }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await jobsAPI.getUpdates(jobId);
      setItems(data || []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  useEffect(() => {
    if (!pollMs) return undefined;
    const t = setInterval(load, pollMs);
    return () => clearInterval(t);
  }, [load, pollMs]);

  const submitComment = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    setSending(true);
    try {
      await jobsAPI.addComment(jobId, message.trim());
      setMessage('');
      await load();
    } catch (err) {
      alert(err.response?.data?.error || 'Could not send update');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="job-activity-panel">
      <div className="job-activity-header">
        <h2>
          <FiMessageCircle /> Progress &amp; updates
        </h2>
        <button type="button" className="btn btn-outline btn-sm" onClick={load} disabled={loading}>
          <FiRefreshCw /> Refresh
        </button>
      </div>
      <p className="job-activity-intro">
        {canComment
          ? 'Everyone on this job sees this timeline. Post notes or questions here.'
          : 'Timeline of changes for this job.'}
      </p>

      {loading && items.length === 0 ? (
        <div className="loading-inline">
          <div className="spinner" />
        </div>
      ) : (
        <ul className="job-activity-list">
          {items.map((row) => (
            <li key={row.id} className="job-activity-item">
              <div className="job-activity-meta">
                <span className="job-activity-kind">{kindLabel[row.kind] || row.kind}</span>
                <span className="job-activity-time">{format(new Date(row.created_at), 'MMM d, yyyy h:mm a')}</span>
              </div>
              <div className="job-activity-actor">
                {row.actor_name || row.actor_role}
                {row.actor_role === 'system' ? ' (automated)' : ''}
              </div>
              <div className="job-activity-summary">{row.summary}</div>
              {row.body ? <div className="job-activity-body">{row.body}</div> : null}
            </li>
          ))}
        </ul>
      )}

      {canComment ? (
        <form className="job-activity-compose" onSubmit={submitComment}>
          <label className="form-label" htmlFor={`job-act-${jobId}`}>
            Add an update
          </label>
          <textarea
            id={`job-act-${jobId}`}
            className="form-control"
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Describe progress, ask a question, or share files received…"
          />
          <button type="submit" className="btn btn-primary" disabled={sending}>
            {sending ? 'Sending…' : 'Post update'}
          </button>
        </form>
      ) : null}
    </div>
  );
}
